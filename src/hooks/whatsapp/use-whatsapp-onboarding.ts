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

  const handleSuccess = useCallback(() => {
    if (callbackHandledRef.current) return
    callbackHandledRef.current = true
    setStatus('success')
    setError(null)
    toast.success('WhatsApp conectado com sucesso!')
    onSuccess?.()
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close()
    popupRef.current = null
  }, [onSuccess])

  const handleFailure = useCallback((message: string) => {
    if (callbackHandledRef.current) return
    callbackHandledRef.current = true
    setStatus('idle')
    setError(message)
    toast.error(message)
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close()
    popupRef.current = null
  }, [])

  // Listen for postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // WA_EMBEDDED_SIGNUP comes from facebook.com — capture phone_number_id
      if (
        typeof event.data === 'string'
          ? (() => { try { return JSON.parse(event.data)?.type } catch { return null } })()
          : event.data?.type === 'WA_EMBEDDED_SIGNUP'
      ) {
        console.log('[Onboarding] WA_EMBEDDED_SIGNUP received from Meta:', event.data)
        return
      }

      // Callback result comes from our own origin
      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'WA_CALLBACK_SUCCESS') {
        console.log('[Onboarding] ✅ WA_CALLBACK_SUCCESS received')
        handleSuccess()
      } else if (event.data?.type === 'WA_CALLBACK_ERROR') {
        console.log('[Onboarding] ❌ WA_CALLBACK_ERROR:', event.data?.message)
        handleFailure(event.data?.message || 'Falha ao conectar com a Meta.')
      }
    }

    // Storage event fires when another window writes to localStorage
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY || !event.newValue) return
      console.log('[Onboarding] Storage event received:', event.newValue)
      const stored = consumeStoredResult()
      if (!stored?.status) return
      if (stored.status === 'success') {
        handleSuccess()
      } else {
        handleFailure(stored.message || 'Falha ao conectar com a Meta.')
      }
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
    }
  }, [consumeStoredResult, handleFailure, handleSuccess])

  const startOnboarding = useCallback(async () => {
    if (isCompletionLoading) {
      toast.error('Validando dados da organização. Tente novamente em alguns segundos.')
      return
    }
    if (isModuleBlocked('whatsapp')) {
      toast.error(integrationBlockMessage)
      return
    }
    if (!sdkReady) {
      toast.error('Configuração da Meta não encontrada.')
      return
    }
    if (!project?.id) {
      toast.error('Nenhum projeto encontrado. Crie um projeto antes de conectar WhatsApp.')
      return
    }

    setStatus('pending')
    setError(null)
    callbackHandledRef.current = false
    window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)

    // Clear any previous popup
    if (onFocusRef.current) {
      window.removeEventListener('focus', onFocusRef.current)
      onFocusRef.current = null
    }
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }

    try {
      const { onboardingUrl, trackingCode } = await apiFetch(
        `/api/v1/whatsapp/onboarding?projectId=${project.id}`,
        { method: 'GET', orgId: organizationId }
      )
      const url = buildWhatsAppEmbeddedSignupUrl(onboardingUrl, trackingCode)

      const width = 640
      const height = 720
      const left = Math.round((window.screen.width - width) / 2)
      const top = Math.round((window.screen.height - height) / 2)
      const specs = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`

      popupRef.current = window.open(url, 'wa_onboarding', specs)

      if (!popupRef.current) {
        setStatus('idle')
        toast.error('Popup bloqueado. Permita popups para este site e tente novamente.')
        return
      }

      // When main window regains focus, check if popup closed
      const onFocus = () => {
        if (popupRef.current && !popupRef.current.closed) return

        window.removeEventListener('focus', onFocus)
        onFocusRef.current = null

        console.log('[Onboarding] Popup closed, checking localStorage...')

        // Check localStorage (callback writes here)
        const stored = consumeStoredResult()
        if (stored?.status === 'success') {
          handleSuccess()
          return
        }
        if (stored?.status === 'error') {
          handleFailure(stored.message || 'Erro ao conectar.')
          return
        }

        if (!callbackHandledRef.current) {
          handleFailure('Onboarding cancelado. Feche o popup sem completar.')
        }
      }

      onFocusRef.current = onFocus
      window.addEventListener('focus', onFocus)
    } catch (err) {
      setStatus('idle')
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar onboarding'
      setError(msg)
      toast.error(msg)
    }
  }, [
    consumeStoredResult,
    handleFailure,
    handleSuccess,
    integrationBlockMessage,
    isCompletionLoading,
    isModuleBlocked,
    organizationId,
    project?.id,
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
      window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
    },
    setError,
    setStatus,
  }
}
