import 'server-only'
import { dashboardRepository } from '../repositories/dashboard.repository'

export interface OriginDailyMetric {
  originKey: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  leadsCount: number
  salesCount: number
  revenue: number
}

/**
 * OriginsMetricsService: computes origin metrics from repository.
 */
export class OriginsMetricsService {
  /**
   * Get metrics aggregated by traffic origin.
   */
  async getMetrics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ): Promise<OriginDailyMetric[]> {
    const metrics = await dashboardRepository.getOriginMetricsGrouped(
      organizationId,
      dateFrom,
      dateTo,
      projectId
    )

    return metrics.map((m) => ({
      originKey: m.originKey,
      utmSource: m.utmSource,
      utmMedium: m.utmMedium,
      utmCampaign: m.utmCampaign,
      leadsCount: m._sum.leadsCount || 0,
      salesCount: m._sum.salesCount || 0,
      revenue: Number(m._sum.revenue || 0),
    }))
  }
}

export const originsMetricsService = new OriginsMetricsService()

/**
 * Legacy function export for backward compatibility.
 */
export async function getOriginMetrics(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  projectId?: string | null
): Promise<OriginDailyMetric[]> {
  return originsMetricsService.getMetrics(organizationId, dateFrom, dateTo, projectId)
}
