import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion'
import { META_ADS_CONNECT_PATH } from '@/lib/meta-ads/client'

export function useMetaAdsOnboarding(organizationId: string | undefined, onSuccess?: () => void) {
  const [isPending, setIsPending] = useState(false)
  const popupRef = useRef<Window | null>(null)
  const onFocusRef = useRef<(() => void) | null>(null)
  const { isLoading: isCompletionLoading, isModuleBlocked, integrationBlockMessage } =
    useOrganizationCompletion()

  const clearState = useCallback(() => {
    if (onFocusRef.current) {
      window.removeEventListener('focus', onFocusRef.current)
      onFocusRef.current = null
    }
    popupRef.current = null
  }, [])

  // Listener de mensagens do popup (Callback)
  const handleSuccess = useCallback(() => {
    setIsPending(false)
    toast.success('Meta Ads conectado com sucesso!')
    onSuccess?.()
    clearState()
  }, [onSuccess, clearState])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'meta-ads-oauth-success') {
        handleSuccess()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleSuccess])

  const startOnboarding = useCallback(() => {
    if (isCompletionLoading) {
      toast.error('Validando dados da organização. Tente novamente em alguns segundos.')
      return
    }

    if (isModuleBlocked('metaAds')) {
      toast.error(integrationBlockMessage)
      return
    }

    if (!organizationId) {
      toast.error('Organização não identificada.')
      return
    }

    setIsPending(true)
    clearState()

    const width = 600
    const height = 700
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2

    popupRef.current = window.open(
      META_ADS_CONNECT_PATH,
      'meta_ads_auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    )

    if (!popupRef.current) {
      setIsPending(false)
      toast.error('O popup foi bloqueado. Permita popups para este site.')
      return
    }

    const onFocus = () => {
      if (popupRef.current?.closed) {
        window.removeEventListener('focus', onFocus)
        onFocusRef.current = null

        setIsPending(false)
        toast.success('Conexão finalizada!')
        onSuccess?.()
      }
    }

    onFocusRef.current = onFocus
    window.addEventListener('focus', onFocus)
  }, [
    organizationId,
    onSuccess,
    clearState,
    integrationBlockMessage,
    isCompletionLoading,
    isModuleBlocked,
  ])

  return {
    isPending,
    startOnboarding,
  }
}
