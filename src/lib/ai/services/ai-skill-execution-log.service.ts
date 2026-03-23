import 'server-only'

import { createHash } from 'node:crypto'

import { Prisma } from '@/lib/db/client'
import { prisma } from '@/lib/db/prisma'
import { fail, ok, type Result } from '@/lib/shared/result'

export function buildExecutionKey(input: {
  conversationId: string
  fingerprint: string
}) {
  return createHash('sha256')
    .update(`${input.conversationId}:${input.fingerprint}`)
    .digest('hex')
}

export async function claimExecution(input: {
  executionKey: string
  organizationId: string
  projectId: string
  conversationId: string
  ticketId?: string | null
  skillId: string
  skillVersion: string
  routingDecision: Record<string, unknown>
}) {
  try {
    const created = await prisma.aiSkillExecutionLog.create({
      data: {
        executionKey: input.executionKey,
        organizationId: input.organizationId,
        projectId: input.projectId,
        conversationId: input.conversationId,
        ticketId: input.ticketId ?? null,
        skillId: input.skillId,
        skillVersion: input.skillVersion,
        routingDecision: input.routingDecision as Prisma.InputJsonValue,
      },
    })

    return ok({
      status: 'created' as const,
      log: created,
    })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.aiSkillExecutionLog.findUnique({
        where: { executionKey: input.executionKey },
      })

      if (existing) {
        return ok({
          status: existing.success ? ('duplicate' as const) : ('in_flight' as const),
          log: existing,
        })
      }
    }

    throw error
  }
}

export async function completeExecution(input: {
  executionLogId: string
  output: string
  outboundPayload: Record<string, unknown>
  outboundResult: unknown
  relatedEventIds: string[]
  durationMs: number
  errorMessage?: string | null
}) {
  const updated = await prisma.aiSkillExecutionLog.update({
    where: { id: input.executionLogId },
    data: {
      output: input.output,
      outboundPayload: input.outboundPayload as Prisma.InputJsonValue,
      outboundResult: input.outboundResult as Prisma.InputJsonValue,
      relatedEventIds: input.relatedEventIds as unknown as Prisma.InputJsonValue,
      success: true,
      durationMs: input.durationMs,
      errorMessage: input.errorMessage ?? null,
    },
  })

  return ok(updated)
}

export async function failExecution(input: {
  executionLogId: string
  durationMs: number
  errorMessage: string
}) {
  const updated = await prisma.aiSkillExecutionLog.update({
    where: { id: input.executionLogId },
    data: {
      success: false,
      durationMs: input.durationMs,
      errorMessage: input.errorMessage,
    },
  })

  return ok(updated)
}

export const aiSkillExecutionLogService = {
  buildExecutionKey,
  claimExecution,
  completeExecution,
  failExecution,
}
