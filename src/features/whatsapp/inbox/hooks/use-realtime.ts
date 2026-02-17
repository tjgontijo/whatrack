'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createCentrifugoClient, subscribeTo } from '@/lib/centrifugo/client'

/**
 * Hook for managing Centrifugo WebSocket connection and subscriptions.
 *
 * Handles:
 * - Fetching connection token from server
 * - Establishing WebSocket connection to Centrifugo
 * - Subscribing to organization-specific channels
 * - Invalidating React Query cache when real-time events arrive
 * - Cleanup on unmount or when organizationId changes
 *
 * @param organizationId - Organization ID to subscribe to events for
 * @returns Connection status and client instance
 */
export function useRealtime(organizationId: string | undefined) {
  const queryClient = useQueryClient()
  const [client, setClient] = useState<any>(null)
  const [connected, setConnected] = useState(false)

  // Fetch Centrifugo connection token
  // Token expires in 1 hour, we fetch at 50 minutes so it's ready for refresh
  const { data: tokenData, refetch: refetchToken } = useQuery({
    queryKey: ['centrifugo-token'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/centrifugo/token')
        if (!res.ok) {
          const error = await res.text()
          console.error('[Centrifugo] Token fetch failed:', res.status, error)
          throw new Error(`Failed to fetch Centrifugo token: ${res.status}`)
        }
        const data = await res.json()
        console.log('[Centrifugo] Token fetched successfully')
        return data
      } catch (error) {
        console.error('[Centrifugo] Token fetch error:', error)
        throw error
      }
    },
    staleTime: 50 * 60 * 1000, // Token valid for 1 hour, stale after 50 minutes
    retry: 3,
  })

  useEffect(() => {
    // Can't connect without token and organizationId
    if (!tokenData?.token || !organizationId) {
      return
    }

    try {
      // Create and connect Centrifugo client
      const centrifuge = createCentrifugoClient(tokenData.token)

      // Listen for connection state changes
      centrifuge.on('connected', () => {
        console.log('[Centrifugo] Connected')
        setConnected(true)
      })

      centrifuge.on('disconnected', () => {
        console.log('[Centrifugo] Disconnected')
        setConnected(false)
      })

      centrifuge.on('error', (error: any) => {
        console.error('[Centrifugo] Connection error:', error)
      })

      centrifuge.connect()
      setClient(centrifuge)

      // Subscribe to message updates channel
      const messagesSub = subscribeTo(
        centrifuge,
        `org:${organizationId}:messages`,
        (data) => {
          console.log('[Centrifugo] Message event:', data)
          // Invalidate specific chat if conversationId is provided
          if (data.conversationId) {
            queryClient.invalidateQueries({
              queryKey: ['chat-messages', data.conversationId]
            })
          } else {
            // Fallback: invalidate all chat-messages queries
            queryClient.invalidateQueries({
              queryKey: ['chat-messages']
            })
          }
          // Invalidate chat list only for this organization
          queryClient.invalidateQueries({
            queryKey: ['whatsapp-chats', organizationId]
          })
        }
      )

      // Subscribe to ticket updates channel
      const ticketsSub = subscribeTo(
        centrifuge,
        `org:${organizationId}:tickets`,
        (data) => {
          console.log('[Centrifugo] Ticket event:', data)
          // Invalidate specific ticket if conversationId is provided
          if (data.conversationId) {
            queryClient.invalidateQueries({
              queryKey: ['conversation-ticket', data.conversationId]
            })
          } else {
            // Fallback: invalidate all tickets
            queryClient.invalidateQueries({
              queryKey: ['conversation-ticket']
            })
          }
          // Invalidate chat list for this organization
          queryClient.invalidateQueries({
            queryKey: ['whatsapp-chats', organizationId]
          })
        }
      )

      // Cleanup function
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
  }, [tokenData, organizationId, queryClient])

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('[Centrifugo] Refreshing token')
      refetchToken()
    }, 50 * 60 * 1000) // 50 minutes

    return () => clearInterval(refreshInterval)
  }, [refetchToken])

  return { connected, client }
}
