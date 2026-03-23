import 'server-only'

import { createHash } from 'node:crypto'
import { z } from 'zod'

import { Prisma } from '@/lib/db/client'
import { prisma } from '@/lib/db/prisma'
import { fail, ok, type Result } from '@/lib/shared/result'

const bufferedMessageSchema = z.object({
  messageId: z.string().uuid(),
  wamid: z.string().min(1),
  body: z.string().nullable(),
  type: z.string().min(1),
  direction: z.literal('INBOUND'),
  timestamp: z.string().datetime(),
})

const bufferedMessagesSchema = z.array(bufferedMessageSchema)

export type BufferedInboundMessage = z.infer<typeof bufferedMessageSchema>

type DbClient = Prisma.TransactionClient | typeof prisma

function parsePendingMessages(value: unknown): BufferedInboundMessage[] {
  if (!value) {
    return []
  }

  const parsed = bufferedMessagesSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}

function buildFingerprint(messages: BufferedInboundMessage[]) {
  return createHash('sha256').update(JSON.stringify(messages)).digest('hex')
}

function getDb(db?: DbClient) {
  return db ?? prisma
}

export async function appendInboundMessage(
  input: {
    organizationId: string
    projectId: string
    conversationId: string
    message: BufferedInboundMessage
  },
  db?: DbClient
) {
  const client = getDb(db)

  const current = await client.aiConversationState.findUnique({
    where: { conversationId: input.conversationId },
    select: {
      id: true,
      pendingMessages: true,
    },
  })

  const pendingMessages = parsePendingMessages(current?.pendingMessages)
  if (pendingMessages.some((message) => message.messageId === input.message.messageId)) {
    return ok({
      count: pendingMessages.length,
      fingerprint: buildFingerprint(pendingMessages),
    })
  }

  const nextPendingMessages = [...pendingMessages, input.message]

  await client.aiConversationState.upsert({
    where: { conversationId: input.conversationId },
    update: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      pendingMessages:
        nextPendingMessages as unknown as Prisma.InputJsonValue,
      pendingMessagesUpdatedAt: new Date(),
    },
    create: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      conversationId: input.conversationId,
      pendingMessages:
        nextPendingMessages as unknown as Prisma.InputJsonValue,
      pendingMessagesUpdatedAt: new Date(),
    },
  })

  return ok({
    count: nextPendingMessages.length,
    fingerprint: buildFingerprint(nextPendingMessages),
  })
}

export async function getConversationState(conversationId: string) {
  const state = await prisma.aiConversationState.findUnique({
    where: { conversationId },
  })

  return ok(state)
}

export async function getPendingSnapshot(conversationId: string) {
  const state = await prisma.aiConversationState.findUnique({
    where: { conversationId },
    include: {
      conversation: {
        include: {
          lead: true,
          instance: {
            select: {
              id: true,
              organizationId: true,
              projectId: true,
              phoneId: true,
              accessToken: true,
              displayPhone: true,
            },
          },
          tickets: {
            where: {
              status: 'open',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          organizationId: true,
        },
      },
    },
  })

  if (!state) {
    return fail(`Conversation state not found for conversation ${conversationId}`)
  }

  const pendingMessages = parsePendingMessages(state.pendingMessages)
  if (pendingMessages.length === 0) {
    return ok({
      state,
      pendingMessages,
      fingerprint: null,
      ticket: state.conversation.tickets[0] ?? null,
    })
  }

  return ok({
    state,
    pendingMessages,
    fingerprint: buildFingerprint(pendingMessages),
    ticket: state.conversation.tickets[0] ?? null,
  })
}

export async function clearProcessedMessages(input: {
  conversationId: string
  fingerprint: string
}) {
  const current = await prisma.aiConversationState.findUnique({
    where: { conversationId: input.conversationId },
    select: {
      id: true,
      pendingMessages: true,
    },
  })

  if (!current) {
    return fail(`Conversation state not found for conversation ${input.conversationId}`)
  }

  const pendingMessages = parsePendingMessages(current.pendingMessages)
  const currentFingerprint = buildFingerprint(pendingMessages)

  if (currentFingerprint !== input.fingerprint) {
    return ok({
      cleared: false,
      reason: 'buffer_changed',
    })
  }

  await prisma.aiConversationState.update({
    where: { conversationId: input.conversationId },
    data: {
      pendingMessages: Prisma.JsonNull,
      pendingMessagesUpdatedAt: null,
      lastProcessedFingerprint: input.fingerprint,
      lastProcessedAt: new Date(),
    },
  })

  return ok({
    cleared: true,
    reason: 'processed',
  })
}

export async function markProcessingError(input: {
  conversationId: string
  fingerprint: string
}) {
  await prisma.aiConversationState.update({
    where: { conversationId: input.conversationId },
    data: {
      lastProcessedFingerprint: input.fingerprint,
      lastProcessedAt: new Date(),
    },
  })

  return ok(true)
}

export const aiConversationStateService = {
  appendInboundMessage,
  getConversationState,
  getPendingSnapshot,
  clearProcessedMessages,
  markProcessingError,
}
