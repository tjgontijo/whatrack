/**
 * Centrifugo Backend Client
 *
 * Server-side client for publishing real-time events to Centrifugo.
 * Used by API routes and webhooks to broadcast messages to connected clients.
 *
 * Channels:
 * - chat:org:${orgId} - Organization-level updates (conversation list)
 * - chat:conversation:${convId} - Messages for a specific conversation
 */

export interface CentrifugoConfig {
  url: string
  apiKey: string
}

export interface ChatEvent {
  type: 'new_message' | 'message_status' | 'conversation_updated' | 'typing'
  data: unknown
}

export interface MessageData {
  id: string
  ticketId: string
  content?: string | null
  senderType: 'LEAD' | 'USER' | 'AI' | 'SYSTEM'
  sentAt: Date
  [key: string]: unknown
}

export interface ConversationData {
  id: string
  leadId: string
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'SNOOZED'
  lastMessageAt?: Date | null
  [key: string]: unknown
}

export class CentrifugoClient {
  constructor(private config: CentrifugoConfig) {}

  async publish(channel: string, data: unknown): Promise<void> {
    const response = await fetch(`${this.config.url}/api/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ channel, data }),
    })

    if (!response.ok) {
      throw new Error(`Centrifugo error: ${response.status}`)
    }
  }
}

// Pre-configured singleton instance
export const centrifugo = new CentrifugoClient({
  url: process.env.CENTRIFUGO_URL || 'http://localhost:8000',
  apiKey: process.env.CENTRIFUGO_API_KEY || 'my-api-key-for-development',
})

/**
 * Publish a new message to a conversation channel
 */
export async function publishNewMessage(
  conversationId: string,
  message: MessageData
): Promise<void> {
  await centrifugo.publish(`chat:conversation:${conversationId}`, {
    type: 'new_message',
    data: message,
  } satisfies ChatEvent)
}

/**
 * Publish a conversation update to the organization channel
 */
export async function publishConversationUpdate(
  organizationId: string,
  conversation: ConversationData
): Promise<void> {
  await centrifugo.publish(`chat:org:${organizationId}`, {
    type: 'conversation_updated',
    data: conversation,
  } satisfies ChatEvent)
}

/**
 * Publish a message status update to a conversation channel
 */
export async function publishMessageStatus(
  conversationId: string,
  messageId: string,
  status: string
): Promise<void> {
  await centrifugo.publish(`chat:conversation:${conversationId}`, {
    type: 'message_status',
    data: { messageId, status },
  } satisfies ChatEvent)
}
