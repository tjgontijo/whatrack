import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion'

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

    const authUrl = `/api/v1/meta-ads/connect?organizationId=${organizationId}`

    popupRef.current = window.open(
      authUrl,
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
