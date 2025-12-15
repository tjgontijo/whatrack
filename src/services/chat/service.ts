/**
 * Chat Service Functions
 *
 * Database operations for the chat system:
 * - upsertLead: Find or create lead by phone/remoteJid
 * - upsertConversation: Find or create conversation for lead
 * - resolveTicket: Find open ticket or create new one
 * - createMessage: Create message linked to ticket
 * - updateConversationLastMessage: Update conversation after new message
 */

import { prisma } from '@/lib/prisma'
import type { Lead, Conversation, Ticket, Message, MessageSenderType } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

export interface UpsertLeadInput {
  organizationId: string
  remoteJid: string
  phone: string
  name?: string | null
}

export interface UpsertConversationInput {
  organizationId: string
  leadId: string
  instanceId: string
}

export interface CreateMessageInput {
  ticketId: string
  senderType: MessageSenderType
  senderId?: string | null
  senderName?: string | null
  messageType: string
  content?: string | null
  mediaUrl?: string | null
  mediaType?: string | null
  fileName?: string | null
  sentAt: Date
}

// ============================================================================
// Lead Functions
// ============================================================================

/**
 * Find or create a lead by phone or remoteJid
 * Updates name if lead exists and name is provided
 */
export async function upsertLead(input: UpsertLeadInput): Promise<Lead> {
  const { organizationId, remoteJid, phone, name } = input

  // Try to find existing lead by remoteJid or phone
  const existingLead = await prisma.lead.findFirst({
    where: {
      organizationId,
      OR: [{ remoteJid }, { phone }],
    },
  })

  if (existingLead) {
    // Update name if provided and lead doesn't have one
    if (name && !existingLead.name) {
      return prisma.lead.update({
        where: { id: existingLead.id },
        data: { name },
      })
    }
    return existingLead
  }

  // Create new lead
  return prisma.lead.create({
    data: {
      organizationId,
      remoteJid,
      phone,
      name,
    },
  })
}

// ============================================================================
// Conversation Functions
// ============================================================================

/**
 * Find or create a conversation for a lead per instance
 * Each lead can have multiple conversations (one per instance)
 */
export async function upsertConversation(input: UpsertConversationInput): Promise<Conversation> {
  const { organizationId, leadId, instanceId } = input

  // Try to find existing conversation for this lead in this instance
  const existingConversation = await prisma.conversation.findUnique({
    where: {
      leadId_instanceId: {
        leadId,
        instanceId,
      },
    },
  })

  if (existingConversation) {
    return existingConversation
  }

  // Create new conversation
  return prisma.conversation.create({
    data: {
      organizationId,
      leadId,
      instanceId,
    },
  })
}

/**
 * Update conversation after a new message
 */
export async function updateConversationLastMessage(
  conversationId: string,
  messageTime: Date
): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: messageTime,
      unreadCount: { increment: 1 },
    },
  })
}

// ============================================================================
// Ticket Functions
// ============================================================================

/**
 * Find an open ticket for conversation or create a new one
 * A ticket represents a support session
 */
export async function resolveTicket(conversationId: string): Promise<Ticket> {
  // Find existing open ticket
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      conversationId,
      status: 'OPEN',
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existingTicket) {
    return existingTicket
  }

  // Get conversation to get organizationId
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { organizationId: true, leadId: true },
  })

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`)
  }

  // Create new ticket
  return prisma.ticket.create({
    data: {
      organizationId: conversation.organizationId,
      conversationId,
      leadId: conversation.leadId,
      status: 'OPEN',
    },
  })
}

// ============================================================================
// Message Functions
// ============================================================================

/**
 * Create a new message linked to a ticket
 */
export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const {
    ticketId,
    senderType,
    senderId,
    senderName,
    messageType,
    content,
    mediaUrl,
    mediaType,
    fileName,
    sentAt,
  } = input

  return prisma.message.create({
    data: {
      ticketId,
      senderType,
      senderId,
      senderName,
      messageType,
      content,
      mediaUrl,
      mediaType,
      fileName,
      sentAt,
      status: 'DELIVERED',
    },
  })
}
