import 'server-only'
import { prisma } from '@/lib/db/prisma'

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
 * Fetch metrics aggregated by traffic origin (UTM parameters).
 */
export async function getOriginMetrics(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  projectId?: string | null
): Promise<OriginDailyMetric[]> {
  const metrics = await prisma.dashboardOriginDailyMetric.groupBy({
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
