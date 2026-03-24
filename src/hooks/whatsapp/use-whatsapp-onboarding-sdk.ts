'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { useProject } from '@/hooks/project/use-project'
import { apiFetch } from '@/lib/api-client'
import { useFacebookSdk } from '@/hooks/whatsapp/use-facebook-sdk'

export type OnboardingSDKStatus = 'idle' | 'pending' | 'success' | 'error'

interface OnboardingCallbackSDKInput {
  code: string
  trackingCode: string
  phoneNumberIds?: string[]
}

export function useWhatsAppOnboardingSDK(onSuccess?: () => void) {
  const { organizationId } = useRequiredProjectRouteContext()
  const { data: project } = useProject()
  const { isLoading: isCompletionLoading, isModuleBlocked, integrationBlockMessage } =
    useOrganizationCompletion()
  const { isReady: fbSdkReady, error: fbSdkError } = useFacebookSdk()

  const [status, setStatus] = useState<OnboardingSDKStatus>('idle')
  const [error, setError] = useState<string | null>(null)

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

    if (!fbSdkReady) {
      const msg = fbSdkError || 'Facebook SDK não carregou. Tente recarregar a página.'
      setError(msg)
      toast.error(msg)
      return
    }

    if (!window.FB) {
      setError('Facebook SDK não disponível.')
      toast.error('Facebook SDK não disponível.')
      return
    }

    const defaultProjectId = project?.id ?? null

    if (!defaultProjectId) {
      setError('Nenhum projeto encontrado. Crie um projeto antes de conectar WhatsApp.')
      toast.error('Nenhum projeto encontrado.')
      return
    }

    setStatus('pending')
    setError(null)

    try {
      // Step 1: Create onboarding session and get tracking code
      const { trackingCode } = await apiFetch(
        `/api/v1/whatsapp/onboarding?projectId=${defaultProjectId}`,
        {
          method: 'GET',
          orgId: organizationId,
        }
      )

      // Step 2: Launch FB.login with config_id and state in extras
      const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID

      if (!configId) {
        throw new Error('Missing NEXT_PUBLIC_META_CONFIG_ID environment variable')
      }

      window.FB.login(
        async (response) => {
          try {
            if (!response.authResponse) {
              setStatus('error')
              setError('Usuário cancelou o login ou ocorreu um erro.')
              toast.error('Conexão cancelada.')
              return
            }

            const code = response.authResponse.code
            const phoneNumberIds = response.authResponse.phone_number_ids || []

            if (!code) {
              setStatus('error')
              setError('Código de autorização não recebido.')
              toast.error('Erro: código não recebido.')
              return
            }

            // Step 3: Send code + phone_number_ids to backend
            const payload: OnboardingCallbackSDKInput = {
              code,
              trackingCode,
              phoneNumberIds: phoneNumberIds.length > 0 ? phoneNumberIds : undefined,
            }

            const result = await fetch('/api/v1/whatsapp/onboarding/callback-sdk', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Organization-ID': organizationId,
              },
              body: JSON.stringify(payload),
            })

            const data = await result.json()

            if (!result.ok) {
              setStatus('error')
              const errMsg = data.error || data.message || 'Erro ao processar onboarding'
              setError(errMsg)
              toast.error(errMsg)
              return
            }

            setStatus('success')
            setError(null)
            toast.success('WhatsApp conectado com sucesso! (via SDK)')
            onSuccess?.()
          } catch (err) {
            setStatus('error')
            const errMsg = err instanceof Error ? err.message : 'Erro desconhecido'
            setError(errMsg)
            toast.error(errMsg)
          }
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
          },
        }
      )
    } catch (err) {
      setStatus('error')
      const errMsg = err instanceof Error ? err.message : 'Erro ao iniciar onboarding'
      setError(errMsg)
      toast.error(errMsg)
    }
  }, [
    organizationId,
    project?.id,
    fbSdkReady,
    fbSdkError,
    integrationBlockMessage,
    isCompletionLoading,
    isModuleBlocked,
    onSuccess,
  ])

  return {
    status,
    error,
    fbSdkReady,
    fbSdkError,
    startOnboarding,
    reset: () => {
      setStatus('idle')
      setError(null)
    },
    setError,
    setStatus,
  }
}
