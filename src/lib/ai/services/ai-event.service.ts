import 'server-only'

import { Prisma } from '@/lib/db/client'
import { prisma } from '@/lib/db/prisma'
import {
  recordAiEventSchema,
  type RecordAiEventInput,
} from '@/lib/ai/schemas/record-ai-event'
import { fail, ok } from '@/lib/shared/result'

type UsagePeriod = '24h' | '7d' | '30d' | '90d'

function resolvePeriodStart(period: UsagePeriod) {
  const now = Date.now()

  switch (period) {
    case '24h':
      return new Date(now - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now - 90 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now - 7 * 24 * 60 * 60 * 1000)
  }
}

async function resolveScopeFromReferences(input: RecordAiEventInput) {
  const [lead, ticket, agent] = await Promise.all([
    input.leadId
      ? prisma.lead.findUnique({
          where: { id: input.leadId },
          select: { organizationId: true, projectId: true },
        })
      : null,
    input.ticketId
      ? prisma.ticket.findUnique({
          where: { id: input.ticketId },
          select: { organizationId: true, projectId: true },
        })
      : null,
    input.agentSlug
      ? prisma.aiAgent.findUnique({
          where: { slug: input.agentSlug },
          select: { id: true },
        })
      : null,
  ])

  const organizationId =
    input.organizationId ?? lead?.organizationId ?? ticket?.organizationId
  const projectId =
    input.projectId ?? lead?.projectId ?? ticket?.projectId ?? null

  return {
    organizationId,
    projectId,
    agentId: agent?.id,
  }
}

export async function record(input: RecordAiEventInput) {
  const parsed = recordAiEventSchema.parse(input)
  const scope = await resolveScopeFromReferences(parsed)

  if (!scope.organizationId) {
    return fail('organizationId is required to record an AI event')
  }

  const created = await prisma.aiEvent.create({
    data: {
      organizationId: scope.organizationId,
      projectId: scope.projectId,
      leadId: parsed.leadId,
      ticketId: parsed.ticketId,
      agentId: scope.agentId,
      type: parsed.type,
      channel: parsed.channel,
      direction: parsed.direction,
      metadata:
        parsed.metadata === undefined
          ? undefined
          : (parsed.metadata as Prisma.InputJsonValue),
      modelId: parsed.modelId,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      costUsd: parsed.costUsd,
      status: parsed.status,
      errorMsg: parsed.errorMsg,
    },
  })

  return ok(created)
}

export async function getLeadTimeline(leadId: string, take = 50) {
  const events = await prisma.aiEvent.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    take,
  })

  return ok(events)
}

export async function getTicketTimeline(ticketId: string, take = 50) {
  const events = await prisma.aiEvent.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'desc' },
    take,
  })

  return ok(events)
}

export async function listByProject(input: {
  organizationId: string
  projectId?: string | null
  type?: string
  status?: string
  take?: number
}) {
  const events = await prisma.aiEvent.findMany({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? undefined,
      type: input.type,
      status: input.status,
    },
    orderBy: { createdAt: 'desc' },
    take: input.take ?? 100,
  })

  return ok(events)
}

export async function getUsageStats(input: {
  organizationId: string
  projectId?: string | null
  period: UsagePeriod
}) {
  const createdAt = { gte: resolvePeriodStart(input.period) }
  const where = {
    organizationId: input.organizationId,
    projectId: input.projectId ?? undefined,
    createdAt,
  }

  const [totals, byType] = await Promise.all([
    prisma.aiEvent.aggregate({
      where,
      _count: { _all: true },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costUsd: true,
      },
    }),
    prisma.aiEvent.groupBy({
      by: ['type'],
      where,
      _count: { _all: true },
    }),
  ])

  return ok({
    totalEvents: totals._count._all,
    totalInputTokens: totals._sum.inputTokens ?? 0,
    totalOutputTokens: totals._sum.outputTokens ?? 0,
    totalCostUsd: totals._sum.costUsd ?? 0,
    byType: byType.map((item) => ({
      type: item.type,
      count: item._count._all,
    })),
  })
}

export const aiEventService = {
  record,
  getLeadTimeline,
  getTicketTimeline,
  listByProject,
  getUsageStats,
}
