import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useOrganizationCompletion } from '@/features/organizations/hooks/use-organization-completion'
import { useProject } from '@/features/projects/hooks/use-project'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import {
  isWhatsAppEmbeddedSignupConfigured,
  WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY,
} from '@/features/whatsapp/lib/onboarding'
import { apiFetch } from '@/lib/api-client'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'

export type OnboardingStatus = 'idle' | 'pending' | 'success'

declare global {
  interface Window {
    FB: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void
      login: (
        callback: (response: { authResponse?: { code?: string } | null }) => void,
        params: {
          config_id: string
          response_type: string
          override_default_response_type: boolean
          extras?: Record<string, unknown>
        }
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

export function useWhatsAppOnboarding(onSuccess?: () => void) {
  const { organizationId } = useRequiredProjectRouteContext()
  const { data: project } = useProject()
  const {
    isLoading: isCompletionLoading,
    isModuleBlocked,
    integrationBlockMessage,
  } = useOrganizationCompletion()
  const [status, setStatus] = useState<OnboardingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const callbackHandledRef = useRef(false)
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trackingCodeRef = useRef<string | null>(null)
  const sdkReady = isWhatsAppEmbeddedSignupConfigured()

  // Load FB SDK once
  useEffect(() => {
    if (typeof window === 'undefined' || window.FB) return

    window.fbAsyncInit = () => {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID!,
        cookie: true,
        xfbml: true,
        version: 'v25.0',
      })
    }

    const script = document.createElement('script')
    script.async = true
    script.defer = true
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    document.head.appendChild(script)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const handleSuccess = useCallback(() => {
    if (callbackHandledRef.current) return
    callbackHandledRef.current = true
    stopPolling()
    setStatus('success')
    setError(null)
    toast.success('WhatsApp conectado com sucesso!')
    onSuccess?.()
    window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
  }, [onSuccess, stopPolling])

  const handleFailure = useCallback(
    (message: string) => {
      if (callbackHandledRef.current) return
      callbackHandledRef.current = true
      stopPolling()
      setStatus('idle')
      setError(message)
      toast.error(message)
    },
    [stopPolling]
  )

  const checkInstances = useCallback(
    async (projectId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/v1/whatsapp/instances?projectId=${projectId}`, {
          headers: { [ORGANIZATION_HEADER]: organizationId },
        })
        if (!res.ok) return false
        const data = (await res.json()) as { items: { status: string }[] }
        return data.items?.some((i) => i.status === 'connected') ?? false
      } catch {
        return false
      }
    },
    [organizationId]
  )

  // Polling fallback after FB.login() callback — only if postMessage Meet in the Middle hasn't resolved
  const startPolling = useCallback(
    (projectId: string) => {
      stopPolling()
      const delays = [1000, 3000, 6000]
      let attempt = 0

      const tryNext = () => {
        if (attempt >= delays.length) {
          if (!callbackHandledRef.current) {
            setStatus('idle')
            toast.error('Conexão não detectada. Verifique as configurações e tente novamente.')
          }
          return
        }
        pollIntervalRef.current = setTimeout(async () => {
          const connected = await checkInstances(projectId)
          if (connected) {
            handleSuccess()
            return
          }
          attempt++
          tryNext()
        }, delays[attempt])
      }

      tryNext()
    },
    [checkInstances, handleSuccess, stopPolling]
  )

  // Listen for postMessage from Meta SDK (FINISH event with phone_number_id)
  // and localStorage result from callback page
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

    const handleMessage = (event: MessageEvent) => {
      console.log('[DEBUG] postMessage received:', event.data)
      try {
        let msgData = event.data
        if (typeof msgData === 'string') {
          msgData = JSON.parse(msgData)
        }
        if (Array.isArray(msgData)) {
          msgData = msgData[0]
        }

        if (msgData?.type === 'WA_EMBEDDED_SIGNUP') {
          // v3 format: { type: 'WA_EMBEDDED_SIGNUP', data: { event: 'FINISH', phone_number_id, waba_id } }
          // legacy format: { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', data: { phone_number_id, waba_id } }
          const isFinish =
            msgData.data?.event === 'FINISH' ||
            msgData.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'

          if (isFinish) {
            const phoneNumberId = msgData.data?.phone_number_id
            const wabaId = msgData.data?.waba_id
            const trackingCode = trackingCodeRef.current

            if (phoneNumberId && trackingCode) {
              fetch('/api/v1/whatsapp/onboarding/phone-number', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: trackingCode, phoneNumberId, wabaId }),
              }).catch(console.error)
            }
          }
        }
      } catch {
        // ignore JSON parse errors
      }

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

  useEffect(() => {
    return () => {
      stopPolling()
    }
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
    if (!window.FB) {
      toast.error('SDK da Meta não carregado. Recarregue a página e tente novamente.')
      return
    }

    setStatus('pending')
    setError(null)
    callbackHandledRef.current = false
    window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)

    try {
      const { trackingCode } = await apiFetch(
        `/api/v1/whatsapp/onboarding?projectId=${project.id}`,
        { method: 'GET', orgId: organizationId }
      )
      trackingCodeRef.current = trackingCode

      const projectId = project.id

      window.FB.login(
        (response) => {
          if (!response.authResponse?.code) {
            setStatus('idle')
            toast.error('Autorização cancelada ou sem resposta do Facebook.')
            return
          }

          // Exchange code for token — Meet in the Middle half B
          fetch('/api/v1/whatsapp/onboarding/exchange', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [ORGANIZATION_HEADER]: organizationId,
            },
            body: JSON.stringify({ code: response.authResponse.code, state: trackingCode }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) {
                // If postMessage (phone-number) arrived first, handleSuccess was already called
                // Otherwise start polling as fallback
                if (!callbackHandledRef.current) {
                  startPolling(projectId)
                }
              } else {
                handleFailure(data.error || 'Erro ao processar autorização.')
              }
            })
            .catch(() => handleFailure('Erro ao conectar com o servidor.'))
        },
        {
          config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID!,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3',
          },
        }
      )
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
    handleFailure,
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
