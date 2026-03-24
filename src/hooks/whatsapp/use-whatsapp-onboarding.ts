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
        const phoneNumberId = event.data?.data?.phone_number_id
        if (phoneNumberId) {
          phoneNumberIdRef.current = phoneNumberId
          console.log('[Onboarding] Captured phone_number_id from postMessage:', phoneNumberId)
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

      // Open in new tab instead of popup
      popupRef.current = window.open(url, '_blank')

      if (!popupRef.current) {
        setStatus('idle')
        setError('Não foi possível abrir a nova aba. Verifique se popups estão permitidos.')
        return
      }

      const onFocus = () => {
        if (!popupRef.current?.closed) return

        window.removeEventListener('focus', onFocus)
        onFocusRef.current = null
        popupRef.current = null

        // If we captured a phone_number_id from Meta's postMessage, send it to backend
        if (phoneNumberIdRef.current && trackingCode) {
          console.log('[Onboarding] Sending captured phone_number_id to backend:', phoneNumberIdRef.current)
          fetch('/api/v1/whatsapp/onboarding/phone-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state: trackingCode,
              phoneNumberId: phoneNumberIdRef.current,
            }),
          }).catch((err) => {
            console.error('[Onboarding] Failed to send phone_number_id:', err)
          })
        }

        if (handleStoredResult()) {
          return
        }

        if (callbackStatusRef.current === 'success') {
          handleSuccess()
          return
        }

        if (!callbackHandledRef.current) {
          handleFailure('Conexão cancelada. A aba de onboarding foi fechada antes de concluir o processo.')
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
