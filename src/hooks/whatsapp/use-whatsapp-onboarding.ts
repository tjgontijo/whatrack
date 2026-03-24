import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { useProject } from '@/hooks/project/use-project'
import { apiFetch } from '@/lib/api-client'
import {
  buildWhatsAppEmbeddedSignupUrl,
  isWhatsAppEmbeddedSignupConfigured,
  WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY,
} from '@/lib/whatsapp/onboarding'

export type OnboardingStatus = 'idle' | 'pending' | 'success'

export function useWhatsAppOnboarding(onSuccess?: () => void) {
  const { organizationId } = useRequiredProjectRouteContext()
  const { data: project } = useProject()
  const { isLoading: isCompletionLoading, isModuleBlocked, integrationBlockMessage } =
    useOrganizationCompletion()
  const [status, setStatus] = useState<OnboardingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)
  const onFocusRef = useRef<(() => void) | null>(null)
  const callbackHandledRef = useRef(false)
  const callbackStatusRef = useRef<'success' | 'error' | null>(null)
  const phoneNumberIdRef = useRef<string | null>(null)
  const sdkReady = isWhatsAppEmbeddedSignupConfigured()

  const consumeStoredResult = useCallback(() => {
    if (typeof window === 'undefined') return null

    const raw = window.localStorage.getItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
    if (!raw) return null

    window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)

    try {
      return JSON.parse(raw) as { status?: 'success' | 'error'; message?: string }
    } catch {
      return null
    }
  }, [])

  const clearState = useCallback(() => {
    if (onFocusRef.current) {
      window.removeEventListener('focus', onFocusRef.current)
      onFocusRef.current = null
    }

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }

    popupRef.current = null
  }, [])

  const handleFailure = useCallback(
    (message: string) => {
      if (callbackHandledRef.current) return

      callbackHandledRef.current = true
      callbackStatusRef.current = 'error'
      setStatus('idle')
      setError(message)
      toast.error(message)
      clearState()
    },
    [clearState]
  )

  const handleSuccess = useCallback(() => {
    if (callbackHandledRef.current) return

    callbackHandledRef.current = true
    callbackStatusRef.current = 'success'
    setStatus('success')
    setError(null)
    toast.success('WhatsApp conectado com sucesso!')
    onSuccess?.()
    clearState()
  }, [clearState, onSuccess])

  const handleStoredResult = useCallback(() => {
    const storedResult = consumeStoredResult()
    if (!storedResult?.status) return false

    if (storedResult.status === 'error') {
      handleFailure(storedResult.message || 'Falha ao conectar com a Meta.')
      return true
    }

    handleSuccess()
    return true
  }, [consumeStoredResult, handleFailure, handleSuccess])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Capture phone_number_id from Meta's Embedded Signup postMessage
      if (event.data?.type === 'WA_EMBEDDED_SIGNUP') {
        console.log('[Onboarding] Received WA_EMBEDDED_SIGNUP event:', event.data)
        const phoneNumberId = event.data?.data?.phone_number_id
        if (phoneNumberId) {
          phoneNumberIdRef.current = phoneNumberId
          console.log('[Onboarding] ✅ Captured phone_number_id from postMessage:', phoneNumberId)
        } else {
          console.log('[Onboarding] ⚠️ No phone_number_id in WA_EMBEDDED_SIGNUP event. Full data:', event.data)
        }
        return
      }

      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'WA_CALLBACK_STATUS') {
        if (event.data.status === 'error') {
          handleFailure(event.data.message || 'Falha ao conectar com a Meta.')
          return
        }

        if (event.data.status === 'success') {
          callbackStatusRef.current = 'success'
          setError(null)
        }
      }

      if (event.data?.type === 'WA_CALLBACK_SUCCESS') {
        handleSuccess()
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY || !event.newValue) return
      handleStoredResult()
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
    }
  }, [handleFailure, handleStoredResult, handleSuccess])

  const startOnboarding = useCallback(async () => {
    if (isCompletionLoading) {
      const loadingMessage = 'Validando dados da organização. Tente novamente em alguns segundos.'
      setError(loadingMessage)
      toast.error(loadingMessage)
      return
    }

    if (isModuleBlocked('whatsapp')) {
      setError(integrationBlockMessage)
      toast.error(integrationBlockMessage)
      return
    }

    if (!sdkReady) {
      setError('Configuração da Meta não encontrada.')
      return
    }

    const defaultProjectId = project?.id ?? null

    if (!defaultProjectId) {
      setError('Nenhum projeto encontrado. Crie um projeto antes de conectar WhatsApp.')
      return
    }

    setStatus('pending')
    setError(null)
    callbackHandledRef.current = false
    callbackStatusRef.current = null
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
    }
    clearState()

    try {
      const { onboardingUrl, trackingCode } = await apiFetch(
        `/api/v1/whatsapp/onboarding?projectId=${defaultProjectId}`,
        {
          method: 'GET',
          orgId: organizationId,
        }
      )
      const url = buildWhatsAppEmbeddedSignupUrl(onboardingUrl, trackingCode)

      // Open as a popup window (not _blank tab) so postMessage can communicate back
      // Window specs: width, height, centered on screen
      const width = 700
      const height = 1000
      const left = (window.innerWidth - width) / 2
      const top = (window.innerHeight - height) / 2
      const windowSpecs = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`

      popupRef.current = window.open(url, 'whatsapp-onboarding', windowSpecs)

      if (!popupRef.current) {
        setStatus('idle')
        setError('Não foi possível abrir o popup. Verifique se popups estão permitidos.')
        return
      }

      // Focus the popup so user sees it
      popupRef.current.focus()

      const onFocus = () => {
        if (!popupRef.current?.closed) return

        window.removeEventListener('focus', onFocus)
        onFocusRef.current = null
        popupRef.current = null

        console.log('[Onboarding] Popup closed, checking result...')

        if (handleStoredResult()) {
          return
        }

        if (callbackStatusRef.current === 'success') {
          handleSuccess()
          return
        }

        if (!callbackHandledRef.current) {
          handleFailure('Conexão cancelada. O popup de onboarding foi fechado antes de concluir o processo.')
        }
      }

      onFocusRef.current = onFocus
      window.addEventListener('focus', onFocus)
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Erro ao iniciar onboarding')
      clearState()
    }
  }, [
    clearState,
    organizationId,
    project?.id,
    handleFailure,
    handleStoredResult,
    handleSuccess,
    integrationBlockMessage,
    isCompletionLoading,
    isModuleBlocked,
    sdkReady,
  ])

  return {
    status,
    error,
    sdkReady,
    startOnboarding,
    reset: () => {
      setStatus('idle')
      setError(null)
      callbackHandledRef.current = false
      callbackStatusRef.current = null
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
      }
      clearState()
    },
    setError,
    setStatus,
  }
}
