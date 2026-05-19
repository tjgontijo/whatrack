import 'server-only'
import { dashboardRepository } from '../repositories/dashboard.repository'

export interface MetaEntityDailyMetric {
  entityKey: string
  metaCampaignId: string | null
  metaAdSetId: string | null
  metaAdId: string | null
  spend: number
  clicks: number
  impressions: number
  leadsAttribued: number
  revenue: number
  roas?: number
}

/**
 * MetaEntityMetricsService: computes Meta entity metrics from repository.
 */
export class MetaEntityMetricsService {
  /**
   * Get metrics aggregated by Meta entity (campaign/adset/ad).
   */
  async getMetrics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectId?: string | null
  ): Promise<MetaEntityDailyMetric[]> {
    const metrics = await dashboardRepository.getMetaEntityMetricsGrouped(
      organizationId,
      dateFrom,
      dateTo,
      projectId
    )

    return metrics.map((m) => {
      const spend = Number(m._sum.spend || 0)
      const revenue = Number(m._sum.revenue || 0)
      return {
        entityKey: m.entityKey,
        metaCampaignId: m.metaCampaignId,
        metaAdSetId: m.metaAdSetId,
        metaAdId: m.metaAdId,
        spend,
        clicks: m._sum.clicks || 0,
        impressions: m._sum.impressions || 0,
        leadsAttribued: m._sum.leadsAttribued || 0,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
      }
    })
  }
}

export const metaEntityMetricsService = new MetaEntityMetricsService()

/**
 * Legacy function export for backward compatibility.
 */
export async function getMetaEntityMetrics(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  projectId?: string | null
): Promise<MetaEntityDailyMetric[]> {
  return metaEntityMetricsService.getMetrics(organizationId, dateFrom, dateTo, projectId)
}
