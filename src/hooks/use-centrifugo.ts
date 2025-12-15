'use client'

/**
 * Centrifugo Real-time Hook
 * Connects to Centrifugo WebSocket for real-time chat updates
 */

import { Centrifuge, Subscription } from 'centrifuge'
import { useEffect, useRef, useState, useCallback } from 'react'

export interface ChatMessage {
  id: string
  ticketId: string
  content: string | null
  senderType: 'LEAD' | 'USER' | 'AI' | 'SYSTEM'
  senderId: string | null
  senderName: string | null
  messageType: string
  mediaUrl: string | null
  sentAt: Date | null
}

export interface ConversationUpdate {
  id: string
  leadId: string
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'SNOOZED'
  lastMessageAt: Date | null
  unreadCount: number
}

export interface TypingEvent {
  conversationId: string
  isTyping: boolean
  userId?: string
}

export interface UseCentrifugoOptions {
  organizationId: string
  enabled?: boolean
  onNewMessage?: (message: ChatMessage) => void
  onConversationUpdated?: (conversation: ConversationUpdate) => void
  onTyping?: (data: TypingEvent) => void
}

export interface UseCentrifugoReturn {
  isConnected: boolean
  error: string | null
  sendTyping: (conversationId: string, isTyping: boolean) => void
}

export function useCentrifugo({
  organizationId,
  enabled = true,
  onNewMessage,
  onConversationUpdated,
  onTyping,
}: UseCentrifugoOptions): UseCentrifugoReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<Centrifuge | null>(null)
  const subRef = useRef<Subscription | null>(null)

  // Use refs for callbacks to avoid stale closure issues
  const callbacksRef = useRef({ onNewMessage, onConversationUpdated, onTyping })
  useEffect(() => {
    callbacksRef.current = { onNewMessage, onConversationUpdated, onTyping }
  }, [onNewMessage, onConversationUpdated, onTyping])

  useEffect(() => {
    if (!enabled || !organizationId) return

    const getToken = async () => {
      const res = await fetch('/api/v1/chat/centrifugo/token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get Centrifugo token')
      const { token } = await res.json()
      return token
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_CENTRIFUGO_URL || 'ws://localhost:8000/connection/websocket'

    const client = new Centrifuge(wsUrl, { getToken })

    client.on('connected', () => {
      setIsConnected(true)
      setError(null)
    })

    client.on('disconnected', () => {
      setIsConnected(false)
    })

    client.on('error', (ctx) => {
      setError(ctx.error?.message || 'Connection error')
    })

    // Subscribe to organization channel
    const sub = client.newSubscription(`chat:org:${organizationId}`)

    sub.on('publication', (ctx) => {
      const event = ctx.data as {
        type: 'new_message' | 'conversation_updated' | 'typing'
        data: ChatMessage | ConversationUpdate | TypingEvent
      }

      switch (event.type) {
        case 'new_message':
          callbacksRef.current.onNewMessage?.(event.data as ChatMessage)
          break
        case 'conversation_updated':
          callbacksRef.current.onConversationUpdated?.(event.data as ConversationUpdate)
          break
        case 'typing':
          callbacksRef.current.onTyping?.(event.data as TypingEvent)
          break
      }
    })

    sub.subscribe()
    client.connect()

    clientRef.current = client
    subRef.current = sub

    return () => {
      sub.unsubscribe()
      client.disconnect()
    }
  }, [organizationId, enabled])

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    // Typing indicators via Centrifugo RPC or separate endpoint
    // Could be implemented via fetch to a typing endpoint
    console.log('[centrifugo] sendTyping', { conversationId, isTyping })
  }, [])

  return { isConnected, error, sendTyping }
}
