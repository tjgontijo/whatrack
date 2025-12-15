/**
 * Conversation Service
 *
 * Handles Conversation operations for chat
 */

import { prisma } from "@/lib/prisma";

interface FindOrCreateConversationInput {
  organizationId: string;
  instanceId: string;
  leadId: string;
  reopenIfResolved?: boolean;
}

/**
 * Find or create a conversation for a lead (1:1 relationship)
 */
export async function findOrCreateConversation(input: FindOrCreateConversationInput) {
  const { organizationId, instanceId, leadId, reopenIfResolved = true } = input;

  // Try to find existing conversation by leadId (1:1 relationship)
  const existing = await prisma.conversation.findFirst({
    where: {
      leadId,
      organizationId,
    },
  });

  if (existing) {
    // Reopen if resolved and flag is set
    if (reopenIfResolved && existing.status === "RESOLVED") {
      return await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          status: "OPEN",
        },
      });
    }
    return existing;
  }

  // Create new conversation (1:1 with Lead)
  return await prisma.conversation.create({
    data: {
      organizationId,
      leadId,
      instanceId,
      status: "OPEN",
      priority: "MEDIUM",
    },
  });
}

/**
 * Update conversation lastMessageAt timestamp
 */
export async function updateConversationLastMessage(conversationId: string) {
  return await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
    },
  });
}

/**
 * Get conversation ID (for AI agent)
 */
export async function getConversationThreadId(conversationId: string): Promise<string | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });
  return conversation?.id ?? null;
}
