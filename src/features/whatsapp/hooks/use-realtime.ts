'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { buildOrgMessagesChannel } from '@/lib/centrifugo/channels'
import { apiFetch } from '@/lib/http/api-client'
import { createCentrifugoClient, subscribeTo } from '@/lib/centrifugo/client'

function _normalizeCentrifugoIssue(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const issue = payload as Record<string, unknown>
  const nestedError =
    issue.error && typeof issue.error === 'object' ? (issue.error as Record<string, unknown>) : {}

  const details = {
    type: issue.type ?? null,
    code: issue.code ?? nestedError.code ?? null,
    message: issue.message ?? issue.reason ?? nestedError.message ?? null,
    temporary: issue.temporary ?? nestedError.temporary ?? null,
    transport: issue.transport ?? null,
  }

  const hasUsefulData = Object.values(details).some((value) => value !== null && value !== '')
  return hasUsefulData ? details : null
}

/**
 * Hook for managing Centrifugo WebSocket connection and subscriptions.
 */
export function useRealtime(organizationId: string | undefined) {
  const queryClient = useQueryClient()
  const [client, setClient] = useState<any>(null)
  const [connected, setConnected] = useState(false)

  // Fetch Centrifugo connection token
  const { data: tokenData } = useQuery({
    queryKey: ['centrifugo-token', organizationId],
    queryFn: async () => {
      const data = await apiFetch('/api/v1/centrifugo/token', {
        orgId: organizationId,
      })
      return data as { token: string }
    },

    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000, // Automático pelo TanStack Query
    enabled: !!organizationId,
  })

  useEffect(() => {
    if (!tokenData?.token || !organizationId) return

    try {
      const centrifuge = createCentrifugoClient(tokenData.token)

      centrifuge.on('connected', (ctx: unknown) => {
        setConnected(true)
        console.info('[Centrifugo] Connected', _normalizeCentrifugoIssue(ctx) ?? ctx)
      })
      centrifuge.on('disconnected', (ctx: unknown) => {
        setConnected(false)
        console.warn('[Centrifugo] Disconnected', _normalizeCentrifugoIssue(ctx) ?? ctx)
      })
      centrifuge.on('error', (ctx: unknown) => {
        console.error('[Centrifugo] Client error', _normalizeCentrifugoIssue(ctx) ?? ctx)
      })

      centrifuge.connect()
      setClient(centrifuge)

      const messagesSub = subscribeTo(centrifuge, buildOrgMessagesChannel(organizationId), (data) => {
        if (data.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ['chat-messages', data.conversationId, organizationId],
          })
        }
        queryClient.invalidateQueries({
          queryKey: ['whatsapp-chats', organizationId],
        })
      })

      return () => {
        messagesSub.unsubscribe()
        centrifuge.disconnect()
        setClient(null)
        setConnected(false)
      }
    } catch (error) {
      console.error('[Centrifugo] Setup error:', error)
    }
  }, [tokenData?.token, organizationId, queryClient])

  return { connected, client }
}
