import 'server-only'
import { prisma } from '@/lib/db/prisma'

/**
 * DashboardRepository: encapsulates all database queries for dashboard features.
 * All methods are database-only: no calculations, no projections, no filtering beyond WHERE.
 */
export class DashboardRepository {
  /**
   * Fetch daily metrics aggregated by date range and organization.
   */
  async getDailyMetrics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ) {
    return prisma.dashboardDailyMetric.findMany({
      where: {
        organizationId,
        projectId: projectId ?? null,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        date: true,
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
  }

  /**
   * Fetch daily metrics aggregated by organization and date range (for dashboard scorecard).
   */
  async getAggregatedMetrics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ) {
    return prisma.dashboardDailyMetric.aggregate({
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
  }

  /**
   * Fetch origin metrics grouped by UTM origin.
   */
  async getOriginMetricsGrouped(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ) {
    return prisma.dashboardOriginDailyMetric.groupBy({
      by: ['originKey', 'utmSource', 'utmMedium', 'utmCampaign'],
      where: {
        organizationId,
        projectId: projectId ?? null,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      _sum: {
        leadsCount: true,
        salesCount: true,
        revenue: true,
      },
    })
  }

  /**
   * Fetch Meta entity metrics grouped by entity.
   */
  async getMetaEntityMetricsGrouped(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ) {
    return prisma.dashboardMetaEntityDailyMetric.groupBy({
      by: ['entityKey', 'metaCampaignId', 'metaAdSetId', 'metaAdId'],
      where: {
        organizationId,
        projectId: projectId ?? null,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      _sum: {
        spend: true,
        clicks: true,
        impressions: true,
        leadsAttribued: true,
        revenue: true,
      },
    })
  }

  /**
   * Fetch last sync run status.
   */
  async getLastMetaInsightSyncRun(organizationId: string) {
    return prisma.metaInsightSyncRun.findFirst({
      where: { organizationId },
      orderBy: { startedAt: 'desc' },
      select: {
        startedAt: true,
        status: true,
        rowsInserted: true,
        rowsUpdated: true,
        errorMessage: true,
      },
    })
  }

  /**
   * Fetch last dashboard projection run.
   */
  async getLastDashboardRefreshRun(organizationId: string, projectId?: string | null) {
    return prisma.dashboardMetricRefreshRun.findFirst({
      where: {
        organizationId,
        projectId: projectId ?? null,
      },
      orderBy: { startedAt: 'desc' },
      select: {
        startedAt: true,
        status: true,
        errorMessage: true,
      },
    })
  }

  /**
   * Fetch organization analytics settings.
   */
  async getAnalyticsSettings(organizationId: string) {
    return prisma.organizationAnalyticsSettings.findUnique({
      where: { organizationId },
      select: {
        baseCurrency: true,
        timezoneName: true,
      },
    })
  }
}

export const dashboardRepository = new DashboardRepository()
