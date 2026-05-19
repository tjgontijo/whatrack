import 'server-only'
import { prisma } from '@/lib/db/prisma'

export interface ExecutiveScorecardMetrics {
  date: Date
  revenueCompleted: number
  revenuePipeline: number
  metaPaidSpend: number
  metaPaidRevenue: number
  metaPaidClicks: number
  metaPaidImpressions: number
  leadsTotal: number
  leadsMetaPaid: number
  salesTotal: number
  salesMetaAttribued: number
}

/**
 * Fetch executive scorecard metrics for a given date range.
 * Aggregates metrics from DashboardDailyMetric.
 */
export async function getExecutiveScorecardMetrics(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  projectId?: string | null
): Promise<ExecutiveScorecardMetrics> {
  const metrics = await prisma.dashboardDailyMetric.aggregate({
    where: {
      organizationId,
      projectId: projectId ?? null,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    _sum: {
      revenueCompleted: true,
      revenuePending: true,
      revenuePipeline: true,
      metaPaidSpend: true,
      metaPaidRevenue: true,
      metaPaidClicks: true,
      metaPaidImpressions: true,
      leadsTotal: true,
      leadsMetaPaid: true,
      salesTotal: true,
      salesMetaAttribued: true,
    },
  })

  return {
    date: new Date(),
    revenueCompleted: Number(metrics._sum.revenueCompleted || 0),
    revenuePipeline: Number(metrics._sum.revenuePipeline || 0),
    metaPaidSpend: Number(metrics._sum.metaPaidSpend || 0),
    metaPaidRevenue: Number(metrics._sum.metaPaidRevenue || 0),
    metaPaidClicks: Number(metrics._sum.metaPaidClicks || 0),
    metaPaidImpressions: Number(metrics._sum.metaPaidImpressions || 0),
    leadsTotal: Number(metrics._sum.leadsTotal || 0),
    leadsMetaPaid: Number(metrics._sum.leadsMetaPaid || 0),
    salesTotal: Number(metrics._sum.salesTotal || 0),
    salesMetaAttribued: Number(metrics._sum.salesMetaAttribued || 0),
  }
}

/**
 * Get executive scorecard for a custom date range or preset.
 */
export async function getExecutiveScorecard(
  organizationId: string,
  dateRange: { from: Date; to: Date },
  projectId?: string | null
): Promise<ExecutiveScorecardMetrics> {
  return getExecutiveScorecardMetrics(organizationId, dateRange.from, dateRange.to, projectId)
}
