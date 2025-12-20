/**
 * Chat Services
 * Core functions for Lead, Conversation, Ticket, and Message management
 */

import { prisma } from '@/lib/prisma'
import type {
  Lead,
  Ticket,
  WhatsappMessage,
  MessageSenderType,
  MessageType,
  WhatsappConversation,
} from '@prisma/client'

// =============================================================================
// Lead Operations
// =============================================================================

interface UpsertLeadParams {
  organizationId: string
  remoteJid: string
  phone: string
  name: string | null
}

export async function upsertLead(params: UpsertLeadParams): Promise<Lead> {
  const { organizationId, remoteJid, phone, name } = params

  // Try to find by remoteJid first, then by phone
  const existing = await prisma.lead.findFirst({
    where: {
      organizationId,
      OR: [{ remoteJid }, { phone }],
    },
  })

  if (existing) {
    // Update name if provided and not set
    if (name && !existing.name) {
      return prisma.lead.update({
        where: { id: existing.id },
        data: { name, remoteJid },
      })
    }
    // Update remoteJid if not set
    if (!existing.remoteJid && remoteJid) {
      return prisma.lead.update({
        where: { id: existing.id },
        data: { remoteJid },
      })
    }
    return existing
  }

  // Create new lead
  return prisma.lead.create({
    data: {
      organizationId,
      phone,
      name,
      remoteJid,
    },
  })
}

// =============================================================================
// Conversation Operations
// =============================================================================

interface UpsertConversationParams {
  organizationId: string
  leadId: string
  instanceId: string
}

export async function upsertConversation(
  params: UpsertConversationParams
): Promise<WhatsappConversation> {
  const { organizationId, leadId, instanceId } = params

  // Conversation is unique per (leadId, instanceId) - allows N conversations per lead across instances
  const existing = await prisma.whatsappConversation.findUnique({
    where: {
      leadId_instanceId: {
        leadId,
        instanceId,
      },
    },
  })

  if (existing) {
    return existing
  }

  // Create new conversation
  return prisma.whatsappConversation.create({
    data: {
      organizationId,
      leadId,
      instanceId,
      status: 'OPEN',
      priority: 'MEDIUM',
    },
  })
}

export async function updateConversationLastMessage(
  conversationId: string,
  lastMessageAt: Date
): Promise<WhatsappConversation> {
  return prisma.whatsappConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt,
      unreadCount: { increment: 1 },
    },
  })
}

// =============================================================================
// Ticket Operations
// =============================================================================

export async function resolveTicket(conversationId: string): Promise<Ticket> {
  // Find open ticket for this conversation
  const existing = await prisma.ticket.findFirst({
    where: {
      whatsappConversationId: conversationId,
      status: 'OPEN',
    },
  })

  if (existing) {
    return existing
  }

  // Get conversation to get organizationId
  const conversation = await prisma.whatsappConversation.findUnique({
    where: { id: conversationId },
    select: { organizationId: true },
  })

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`)
  }

  // Create new ticket
  return prisma.ticket.create({
    data: {
      organizationId: conversation.organizationId,
      whatsappConversationId: conversationId,
      status: 'OPEN',
    },
  })
}

// =============================================================================
// Message Operations
// =============================================================================

interface CreateMessageParams {
  ticketId: string
  senderType: 'LEAD' | 'USER' | 'AI' | 'SYSTEM'
  senderId: string | null
  senderName: string | null
  messageType: string
  content: string
  mediaUrl: string | null
  mediaType: string | null
  fileName: string | null
  mediaSizeBytes?: number | null
  mediaDurationSeconds?: number | null
  providerMessageId?: string | null
  sentAt: Date
}

export async function createMessage(params: CreateMessageParams): Promise<WhatsappMessage> {
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
    mediaSizeBytes,
    mediaDurationSeconds,
    providerMessageId,
    sentAt,
  } = params

  // Map message type to valid enum value
  const validMessageType = mapMessageType(messageType)

  return prisma.whatsappMessage.create({
    data: {
      ticketId,
      senderType: senderType as MessageSenderType,
      senderId,
      senderName,
      messageType: validMessageType,
      content,
      mediaUrl,
      mediaType,
      fileName,
      mediaSizeBytes,
      mediaDurationSeconds,
      providerMessageId,
      sentAt,
    },
  })
}

function mapMessageType(type: string): MessageType {
  const upperType = type.toUpperCase()
  const validTypes: MessageType[] = ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']
  return validTypes.includes(upperType as MessageType) ? (upperType as MessageType) : 'TEXT'
}
