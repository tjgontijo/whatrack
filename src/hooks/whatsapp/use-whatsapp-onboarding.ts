import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion'
import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'
import {
  buildWhatsAppEmbeddedSignupUrl,
  isWhatsAppEmbeddedSignupConfigured,
} from '@/lib/whatsapp/onboarding'

export type OnboardingStatus = 'idle' | 'pending' | 'success'

export function useWhatsAppOnboarding(onSuccess?: () => void) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { isLoading: isCompletionLoading, isModuleBlocked, integrationBlockMessage } =
    useOrganizationCompletion()
  const [status, setStatus] = useState<OnboardingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)
  const onFocusRef = useRef<(() => void) | null>(null)
  const callbackHandledRef = useRef(false)
  const callbackStatusRef = useRef<'success' | 'error' | null>(null)
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleFailure, handleSuccess])

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
    callbackHandledRef.current = false
    callbackStatusRef.current = null
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
        if (!popupRef.current?.closed) return

        window.removeEventListener('focus', onFocus)
        onFocusRef.current = null
        popupRef.current = null

        if (callbackStatusRef.current === 'success') {
          handleSuccess()
          return
        }

        if (!callbackHandledRef.current) {
          handleFailure('Conexão cancelada. Popup foi fechado antes de concluir o processo.')
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
    clearState,
    handleFailure,
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
      clearState()
    },
    setError,
    setStatus,
  }
}
