import 'server-only'

import { prisma } from '@/lib/db/prisma'

type UsagePeriod = '24h' | '7d' | '30d' | '90d'

const PERIOD_MS: Record<UsagePeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
}

export async function getProjectAiUsage(input: {
  organizationId: string
  projectId?: string | null
  period: UsagePeriod
}) {
  const since = new Date(Date.now() - PERIOD_MS[input.period])
  const where = {
    organizationId: input.organizationId,
    projectId: input.projectId ?? undefined,
    createdAt: { gte: since },
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

  return {
    totalEvents: totals._count._all,
    totalInputTokens: totals._sum.inputTokens ?? 0,
    totalOutputTokens: totals._sum.outputTokens ?? 0,
    totalCostUsd: totals._sum.costUsd ?? 0,
    byType: byType.map((item) => ({
      type: item.type,
      count: item._count._all,
    })),
  }
}
