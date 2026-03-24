import { useCallback, useEffect, useState } from 'react'
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
  const [modalOpen, setModalOpen] = useState(false)
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)
  const sdkReady = isWhatsAppEmbeddedSignupConfigured()

  // Listen for postMessage from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return

      console.log('[Onboarding] Received postMessage:', event.data?.type)

      // Handle success from callback
      if (event.data?.type === 'WA_CALLBACK_SUCCESS') {
        console.log('[Onboarding] ✅ Onboarding completed!')
        setStatus('success')
        setError(null)
        toast.success('WhatsApp conectado com sucesso!')
        setModalOpen(false)
        onSuccess?.()
        return
      }

      // Handle error from callback
      if (event.data?.type === 'WA_CALLBACK_ERROR') {
        const message = event.data?.message || 'Falha ao conectar com a Meta.'
        console.log('[Onboarding] ❌ Error:', message)
        setStatus('idle')
        setError(message)
        toast.error(message)
        setModalOpen(false)
        return
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [onSuccess])

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

    try {
      const { onboardingUrl, trackingCode } = await apiFetch(
        `/api/v1/whatsapp/onboarding?projectId=${defaultProjectId}`,
        {
          method: 'GET',
          orgId: organizationId,
        }
      )
      const url = buildWhatsAppEmbeddedSignupUrl(onboardingUrl, trackingCode)

      console.log('[Onboarding] Opening iframe with URL:', url)
      setIframeUrl(url)
      setModalOpen(true)
    } catch (err) {
      setStatus('idle')
      const errorMsg = err instanceof Error ? err.message : 'Erro ao iniciar onboarding'
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }, [
    isCompletionLoading,
    isModuleBlocked,
    integrationBlockMessage,
    sdkReady,
    project?.id,
    organizationId,
  ])

  return {
    status,
    error,
    sdkReady,
    startOnboarding,
    modalOpen,
    setModalOpen,
    iframeUrl,
    reset: () => {
      setStatus('idle')
      setError(null)
      setModalOpen(false)
      setIframeUrl(null)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
      }
    },
    setError,
    setStatus,
  }
}
