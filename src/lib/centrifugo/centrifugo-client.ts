/**
 * Centrifugo Client
 * Stub implementation for real-time message publishing
 * TODO: Implement actual Centrifugo integration
 */

export interface MessageData {
  id: string
  ticketId: string
  content: string | null
  senderType: 'LEAD' | 'USER' | 'AI' | 'SYSTEM'
  sentAt: Date | null
  messageType: string
  mediaUrl: string | null
  senderId: string | null
  senderName: string | null
}

export interface ConversationData {
  id: string
  leadId: string
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'SNOOZED'
  lastMessageAt: Date | null
  unreadCount: number
}

export async function publishNewMessage(
  conversationId: string,
  message: MessageData
): Promise<void> {
  // TODO: Implement Centrifugo publish
  console.log(`[centrifugo] Would publish message to conversation:${conversationId}`, {
    messageId: message.id,
  })
}

export async function publishConversationUpdate(
  organizationId: string,
  conversation: ConversationData
): Promise<void> {
  // TODO: Implement Centrifugo publish
  console.log(`[centrifugo] Would publish conversation update to org:${organizationId}`, {
    conversationId: conversation.id,
  })
}
