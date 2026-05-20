import 'server-only'
import type { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { dashboardRepository } from '../repositories/dashboard.repository'

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
 * ExecutiveScorecardService: computes scorecard metrics from repository.
 * Uses DashboardRepository for data access.
 */
export class ExecutiveScorecardService {
  /**
   * Compute executive scorecard metrics for a date range.
   */
  async getMetrics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ): Promise<ExecutiveScorecardMetrics> {
    const metrics = await dashboardRepository.getAggregatedMetrics(
      organizationId,
      dateFrom,
      dateTo,
      projectId
    )

    const readModelMetrics = {
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

    const hasBusinessMetrics =
      readModelMetrics.revenueCompleted > 0 ||
      readModelMetrics.revenuePipeline > 0 ||
      readModelMetrics.leadsTotal > 0 ||
      readModelMetrics.salesTotal > 0

    if (hasBusinessMetrics) {
      return readModelMetrics
    }

    const sourceMetrics = await this.getSourceMetrics(organizationId, dateFrom, dateTo, projectId)

    return {
      ...sourceMetrics,
      metaPaidSpend: sourceMetrics.metaPaidSpend || readModelMetrics.metaPaidSpend,
      metaPaidRevenue: sourceMetrics.metaPaidRevenue || readModelMetrics.metaPaidRevenue,
      metaPaidClicks: sourceMetrics.metaPaidClicks || readModelMetrics.metaPaidClicks,
      metaPaidImpressions:
        sourceMetrics.metaPaidImpressions || readModelMetrics.metaPaidImpressions,
    }
  }

  private async getSourceMetrics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ): Promise<ExecutiveScorecardMetrics> {
    const scope = {
      organizationId,
      ...(projectId ? { projectId } : {}),
    }
    const dateFilter = { gte: dateFrom, lte: dateTo }
    const metaPaidDealWhere: Prisma.DealWhereInput = {
      OR: [
        { tracking: { is: { ctwaclid: { not: null } } } },
        { tracking: { is: { fbclid: { not: null } } } },
        { tracking: { is: { metaAdId: { not: null } } } },
      ],
    }
    const completedSalesWhere: Prisma.SaleWhereInput = {
      ...scope,
      status: 'completed',
      createdAt: dateFilter,
    }
    const metaPaidSalesWhere: Prisma.SaleWhereInput = {
      ...completedSalesWhere,
      deal: { is: metaPaidDealWhere },
    }

    const [
      completedSales,
      pipelineDeals,
      leadsTotal,
      leadsMetaPaid,
      salesTotal,
      salesMetaAttribued,
      metaPaidSales,
      metaInsights,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: completedSalesWhere,
        _sum: { totalAmount: true },
      }),
      prisma.deal.aggregate({
        where: {
          ...scope,
          stage: { statusGroup: 'ACTIVE' },
        },
        _sum: { dealValue: true },
      }),
      prisma.lead.count({
        where: {
          ...scope,
          createdAt: dateFilter,
        },
      }),
      prisma.lead.count({
        where: {
          ...scope,
          createdAt: dateFilter,
          deals: { some: metaPaidDealWhere },
        },
      }),
      prisma.sale.count({ where: completedSalesWhere }),
      prisma.sale.count({ where: metaPaidSalesWhere }),
      prisma.sale.aggregate({
        where: metaPaidSalesWhere,
        _sum: { totalAmount: true },
      }),
      prisma.metaAdInsightDaily.aggregate({
        where: {
          ...scope,
          date: dateFilter,
        },
        _sum: {
          spend: true,
          clicks: true,
          impressions: true,
        },
      }),
    ])

    return {
      date: new Date(),
      revenueCompleted: Number(completedSales._sum.totalAmount || 0),
      revenuePipeline: Number(pipelineDeals._sum.dealValue || 0),
      metaPaidSpend: Number(metaInsights._sum.spend || 0),
      metaPaidRevenue: Number(metaPaidSales._sum.totalAmount || 0),
      metaPaidClicks: Number(metaInsights._sum.clicks || 0),
      metaPaidImpressions: Number(metaInsights._sum.impressions || 0),
      leadsTotal,
      leadsMetaPaid,
      salesTotal,
      salesMetaAttribued,
    }
  }
}

export const executiveScorecardService = new ExecutiveScorecardService()

/**
 * Legacy function exports for backward compatibility.
 */
export async function getExecutiveScorecardMetrics(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  projectId?: string | null
): Promise<ExecutiveScorecardMetrics> {
  return executiveScorecardService.getMetrics(organizationId, dateFrom, dateTo, projectId)
}

export async function getExecutiveScorecard(
  organizationId: string,
  dateRange: { from: Date; to: Date },
  projectId?: string | null
): Promise<ExecutiveScorecardMetrics> {
  return executiveScorecardService.getMetrics(
    organizationId,
    dateRange.from,
    dateRange.to,
    projectId
  )
}
