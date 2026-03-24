import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { useProject } from '@/hooks/project/use-project'
import { apiFetch } from '@/lib/api-client'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import {
  buildWhatsAppEmbeddedSignupUrl,
  isWhatsAppEmbeddedSignupConfigured,
  WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY,
} from '@/lib/whatsapp/onboarding'

export type OnboardingStatus = 'idle' | 'pending' | 'success'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 200 // 10 minutes total

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
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollAttemptsRef = useRef(0)
  const trackingCodeRef = useRef<string | null>(null)
  const sdkReady = isWhatsAppEmbeddedSignupConfigured()

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    pollAttemptsRef.current = 0
  }, [])

  const handleSuccess = useCallback(() => {
    if (callbackHandledRef.current) return
    callbackHandledRef.current = true
    stopPolling()
    setStatus('success')
    setError(null)
    toast.success('WhatsApp conectado com sucesso!')
    onSuccess?.()
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close()
    popupRef.current = null
    if (onFocusRef.current) {
      window.removeEventListener('focus', onFocusRef.current)
      onFocusRef.current = null
    }
  }, [onSuccess, stopPolling])

  const handleFailure = useCallback((message: string) => {
    if (callbackHandledRef.current) return
    callbackHandledRef.current = true
    stopPolling()
    setStatus('idle')
    setError(message)
    toast.error(message)
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close()
    popupRef.current = null
    if (onFocusRef.current) {
      window.removeEventListener('focus', onFocusRef.current)
      onFocusRef.current = null
    }
  }, [stopPolling])

  const startPolling = useCallback((projectId: string) => {
    stopPolling()
    pollAttemptsRef.current = 0

    pollIntervalRef.current = setInterval(async () => {
      pollAttemptsRef.current++

      try {
        const res = await fetch(`/api/v1/whatsapp/instances?projectId=${projectId}`, {
          headers: { [ORGANIZATION_HEADER]: organizationId },
        })
        if (!res.ok) return

        const data = await res.json() as { items: { status: string }[] }
        const connected = data.items?.some((i) => i.status === 'connected')

        if (connected) {
          handleSuccess()
          return
        }
      } catch {
        // ignore, keep polling
      }

      if (pollAttemptsRef.current >= POLL_MAX_ATTEMPTS) {
        stopPolling()
        setStatus('idle')
        toast.error('Tempo esgotado. Feche o popup e tente novamente se a conexão não aparecer.')
      }
    }, POLL_INTERVAL_MS)
  }, [organizationId, handleSuccess, stopPolling])

  // Listen for localStorage result (set by callback page)
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY || !event.newValue) return
      try {
        const stored = JSON.parse(event.newValue) as { status?: string; message?: string }
        window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
        if (stored.status === 'success') handleSuccess()
        else if (stored.status === 'error') handleFailure(stored.message || 'Erro ao conectar.')
      } catch {
        // ignore
      }
    }

    // postMessage from callback (via opener chain or Meta popup)
    const handleMessage = (event: MessageEvent) => {
      // 1. Listen for Meta's message (FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING)
      try {
        let msgData = event.data
        if (typeof msgData === 'string') {
          msgData = JSON.parse(msgData)
        }
        
        // Meta sometimes wraps the payload in an array
        if (Array.isArray(msgData)) {
          msgData = msgData[0]
        }

        if (
          msgData?.type === 'WA_EMBEDDED_SIGNUP' &&
          msgData?.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
        ) {
          const phoneNumberId = msgData.data?.phone_number_id
          const trackingCode = trackingCodeRef.current
          
          if (phoneNumberId && trackingCode) {
            fetch('/api/v1/whatsapp/onboarding/phone-number', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state: trackingCode, phoneNumberId })
            }).catch(console.error)
          }
        }
      } catch (err) {
        // ignore JSON parse errors
      }

      // 2. Listen for our own callback page's message
      if (event.data?.type === 'WA_CALLBACK_SUCCESS') handleSuccess()
      else if (event.data?.type === 'WA_CALLBACK_ERROR') {
        handleFailure(event.data?.message || 'Erro ao conectar.')
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('message', handleMessage)
    }
  }, [handleFailure, handleSuccess])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

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

    if (onFocusRef.current) {
      window.removeEventListener('focus', onFocusRef.current)
      onFocusRef.current = null
    }
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close()

    try {
      const { onboardingUrl, trackingCode } = await apiFetch(
        `/api/v1/whatsapp/onboarding?projectId=${project.id}`,
        { method: 'GET', orgId: organizationId }
      )
      trackingCodeRef.current = trackingCode
      const url = buildWhatsAppEmbeddedSignupUrl(onboardingUrl, trackingCode)

      const width = 640
      const height = 720
      const left = Math.round((window.screen.width - width) / 2)
      const top = Math.round((window.screen.height - height) / 2)
      const specs = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`

      popupRef.current = window.open(url, 'wa_onboarding', specs)

      if (!popupRef.current) {
        setStatus('idle')
        toast.error('Popup bloqueado. Permita popups para este site e tente novamente.')
        return
      }

      // Start polling immediately — catches the case where popup never closes
      startPolling(project.id)

      // Also watch for popup close via focus event as a secondary signal
      const onFocus = () => {
        if (popupRef.current && !popupRef.current.closed) return
        window.removeEventListener('focus', onFocus)
        onFocusRef.current = null
        // Polling will handle success/failure — just stop if already handled
        if (callbackHandledRef.current) stopPolling()
      }

      onFocusRef.current = onFocus
      window.addEventListener('focus', onFocus)
    } catch (err) {
      setStatus('idle')
      stopPolling()
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar onboarding'
      setError(msg)
      toast.error(msg)
    }
  }, [
    integrationBlockMessage,
    isCompletionLoading,
    isModuleBlocked,
    organizationId,
    project?.id,
    sdkReady,
    startPolling,
    stopPolling,
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
      stopPolling()
      window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
    },
    setError,
    setStatus,
  }
}
