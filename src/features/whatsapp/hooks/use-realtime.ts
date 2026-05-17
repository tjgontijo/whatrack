'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createCentrifugoClient, subscribeTo } from '@/lib/centrifugo/client'
import { apiFetch } from '@/lib/api-client'


function normalizeCentrifugoIssue(payload: unknown) {
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

      centrifuge.on('connected', () => setConnected(true))
      centrifuge.on('disconnected', () => setConnected(false))

      centrifuge.connect()
      setClient(centrifuge)

      const messagesSub = subscribeTo(centrifuge, `org:${organizationId}:messages`, (data) => {
        if (data.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ['chat-messages', data.conversationId, organizationId],
          })
        }
        queryClient.invalidateQueries({
          queryKey: ['whatsapp-chats', organizationId],
        })
      })

      const ticketsSub = subscribeTo(centrifuge, `org:${organizationId}:tickets`, (data) => {
        if (data.conversationId) {
          queryClient.invalidateQueries({
            queryKey: ['conversation-ticket', data.conversationId, organizationId],
          })
        }
        queryClient.invalidateQueries({
          queryKey: ['whatsapp-chats', organizationId],
        })
      })

      return () => {
        messagesSub.unsubscribe()
        ticketsSub.unsubscribe()
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
