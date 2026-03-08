import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'
import {
  buildWhatsAppEmbeddedSignupUrl,
  isWhatsAppEmbeddedSignupConfigured,
} from '@/lib/whatsapp/onboarding'
import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion'

export type OnboardingStatus = 'idle' | 'pending' | 'success'

/**
 * Hook para gerenciar o fluxo de Embedded Signup do WhatsApp Business.
 *
 * Fluxo:
 * 1. Frontend chama GET /api/v1/whatsapp/onboarding para gerar tracking code
 * 2. Abre popup com URL do OAuth da Meta
 * 3. Usuário completa o processo na Meta
 * 4. Meta redireciona para /callback que processa e redireciona para success
 * 5. Popup fecha, frontend detecta e chama onSuccess
 */
export function useWhatsAppOnboarding(onSuccess?: () => void) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { isLoading: isCompletionLoading, isModuleBlocked, integrationBlockMessage } =
    useOrganizationCompletion()
  const [status, setStatus] = useState<OnboardingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)
  const onFocusRef = useRef<(() => void) | null>(null)
  const sdkReady = isWhatsAppEmbeddedSignupConfigured()

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

    if (!activeOrg?.id) {
      setError('Organização não identificada. Faça login novamente.')
      return
    }

    if (!sdkReady) {
      setError('Configuração da Meta não encontrada.')
      return
    }

    setStatus('pending')
    setError(null)
    clearState()

    try {
      const { onboardingUrl, trackingCode } = await apiFetch('/api/v1/whatsapp/onboarding', {
        method: 'GET',
        orgId: activeOrg.id,
      })
      const url = buildWhatsAppEmbeddedSignupUrl(onboardingUrl, trackingCode)

      const width = 800
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      popupRef.current = window.open(
        url,
        'whatsapp_onboarding',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      )

      if (!popupRef.current) {
        setStatus('idle')
        setError('O popup foi bloqueado. Permita popups para este site e tente novamente.')
        return
      }


      const onFocus = () => {
        if (popupRef.current?.closed) {
          window.removeEventListener('focus', onFocus)
          onFocusRef.current = null

          setStatus('success')
          toast.success('Processo concluído! Atualizando...')
          onSuccess?.()
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
    activeOrg?.id,
    onSuccess,
    clearState,
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
      clearState()
    },
    setError,
    setStatus,
  }
}
