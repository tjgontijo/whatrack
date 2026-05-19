import 'server-only'
import { prisma } from '@/lib/db/prisma'

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
 * Fetch metrics aggregated by Meta entity (campaign/adset/ad).
 */
export async function getMetaEntityMetrics(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  projectId?: string | null
): Promise<MetaEntityDailyMetric[]> {
  const metrics = await prisma.dashboardMetaEntityDailyMetric.groupBy({
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
