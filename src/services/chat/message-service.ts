/**
 * Message Service
 *
 * Handles Message operations for chat
 */

import { prisma } from "@/lib/prisma";
import { findOrCreateContact, findOrCreateContactChannel } from "./contact-service";
import { findOrCreateConversation, updateConversationLastMessage } from "./conversation-service";
import type { WhatsappConversation, WhatsappMessage } from "@prisma/client";
import { MessageType } from "@prisma/client";

// Valid message types from Prisma enum
const validMessageTypes: MessageType[] = [
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
];

function normalizeMessageType(type: string | undefined): MessageType {
  if (!type) return "TEXT";
  const upper = type.toUpperCase();

  // Check if it matches a valid message type
  if (validMessageTypes.includes(upper as MessageType)) {
    return upper as MessageType;
  }

  return "TEXT";
}

interface CreateIncomingMessageInput {
  conversationId: string;
  instanceId: string;
  content: string | null;
  senderName: string | null;
  externalId: string;
  messageType?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
}

interface CreateAIMessageInput {
  conversationId: string;
  instanceId: string;
  content: string;
  agentId?: string | null;
}

interface ProcessIncomingMessageInput {
  instanceId: string;
  from: string;
  fromName: string | null;
  sourceId: string;
  content: string | null;
  externalId: string;
  messageType?: string;
  mediaUrl?: string | null;
}

interface ProcessIncomingMessageResult {
  conversation: WhatsappConversation;
  message: WhatsappMessage;
}

/**
 * Create a message from a contact (incoming)
 */
export async function createIncomingMessage(input: CreateIncomingMessageInput) {
  const {
    conversationId,
    instanceId,
    content,
    senderName,
    messageType,
    mediaUrl,
    mediaType,
    fileName,
  } = input;

  return await prisma.whatsappMessage.create({
    data: {
      ticketId: conversationId,
      senderType: "LEAD",
      senderName: senderName,
      messageType: normalizeMessageType(messageType),
      content,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      fileName: fileName,
      status: "DELIVERED",
      sentAt: new Date(),
    },
  });
}

/**
 * Create a message from AI agent (outgoing)
 */
export async function createAIMessage(input: CreateAIMessageInput) {
  const { conversationId, instanceId, content, agentId } = input;

  return await prisma.whatsappMessage.create({
    data: {
      ticketId: conversationId,
      senderType: "AI",
      senderId: agentId,
      messageType: "TEXT",
      content,
      status: "DELIVERED",
      sentAt: new Date(),
    },
  });
}

/**
 * Process an incoming message from webhook
 * This is the main entry point that orchestrates all services
 */
export async function processIncomingMessage(
  input: ProcessIncomingMessageInput
): Promise<ProcessIncomingMessageResult | null> {
  const {
    instanceId,
    from,
    fromName,
    sourceId,
    content,
    externalId,
    messageType = "TEXT",
    mediaUrl,
  } = input;

  // TODO: This function needs to be refactored to work with the new schema
  // For now, returning null as the old Channel/Contact/ContactChannel models don't exist
  console.warn('[processIncomingMessage] Not yet implemented with new schema');
  return null;
}
