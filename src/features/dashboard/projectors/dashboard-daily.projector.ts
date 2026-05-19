import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { revalidateTag } from 'next/cache'
import { attributionRulesService } from '../services/attribution-rules.service'
import { analyticsSettingsService } from '../services/analytics-settings.service'

export class DashboardDailyProjector {
  async projectMetrics(date: string) {
    // date format: YYYY-MM-DD
    const dateObj = new Date(date)

    const orgs = await prisma.organization.findMany({
      select: { id: true },
    })

    for (const org of orgs) {
      try {
        await this.projectOrgMetrics(org.id, dateObj)
      } catch (error) {
        logger.error(
          { organizationId: org.id, date, error },
          '[Dashboard Projector] Org metrics failed'
        )
      }
    }

    // Invalidate cache for all dashboards
    revalidateTag('dashboard-metrics')
    logger.info({ date }, '[Dashboard Projector] Complete')
  }

  private async projectOrgMetrics(organizationId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0]

    // 1. Revenue metrics
    const completedSales = await prisma.sale.aggregate({
      where: {
        organizationId,
        status: 'completed',
        createdAt: {
          gte: date,
          lt: new Date(date.getTime() + 86400000), // Next day
        },
      },
      _sum: { totalAmount: true },
    })

    const pendingSales = await prisma.sale.aggregate({
      where: {
        organizationId,
        status: 'pending',
        createdAt: {
          gte: date,
          lt: new Date(date.getTime() + 86400000),
        },
      },
      _sum: { totalAmount: true },
    })

    const revenueCompleted = Number(completedSales._sum.totalAmount || 0)
    const revenuePending = Number(pendingSales._sum.totalAmount || 0)

    // 2. Pipeline (open deals)
    const pipelineDeals = await prisma.deal.aggregate({
      where: {
        organizationId,
        stage: {
          statusGroup: { not: 'WON', not: 'LOST' },
        },
      },
      _sum: { dealValue: true },
    })

    const revenuePipeline = Number(pipelineDeals._sum.dealValue || 0)

    // 3. Meta Paid metrics
    const metaInsights = await prisma.metaAdInsightDaily.aggregate({
      where: {
        organizationId,
        date: date,
      },
      _sum: {
        spend: true,
        clicks: true,
        impressions: true,
      },
    })

    const metaPaidSpend = Number(metaInsights._sum.spend || 0)
    const metaPaidClicks = Number(metaInsights._sum.clicks || 0) || 0
    const metaPaidImpressions = Number(metaInsights._sum.impressions || 0) || 0

    // 4. Meta Paid Revenue (sales attributed to Meta via ctwaclid/fbclid only)
    const metaPaidSalesData = await prisma.sale.findMany({
      where: {
        organizationId,
        status: 'completed',
        createdAt: {
          gte: date,
          lt: new Date(date.getTime() + 86400000),
        },
        deal: {
          tracking: {},
        },
      },
      select: {
        totalAmount: true,
        deal: {
          select: {
            tracking: {
              select: {
                ctwaclid: true,
                fbclid: true,
              },
            },
          },
        },
      },
    })

    let metaPaidRevenue = 0
    for (const sale of metaPaidSalesData) {
      const tracking = sale.deal?.tracking
      if (tracking && attributionRulesService.isMetaPaidRevenue(tracking)) {
        metaPaidRevenue += Number(sale.totalAmount || 0)
      }
    }

    // 5. Leads (by attribution)
    const leadsTotal = await prisma.lead.count({
      where: {
        organizationId,
        createdAt: {
          gte: date,
          lt: new Date(date.getTime() + 86400000),
        },
      },
    })

    const leadsMetaPaid = await prisma.lead.count({
      where: {
        organizationId,
        createdAt: {
          gte: date,
          lt: new Date(date.getTime() + 86400000),
        },
        deals: {
          some: {
            tracking: {
              ctwaclid: { not: null },
            },
          },
        },
      },
    })

    // 6. Sales count
    const salesTotal = await prisma.sale.count({
      where: {
        organizationId,
        createdAt: {
          gte: date,
          lt: new Date(date.getTime() + 86400000),
        },
      },
    })

    const salesMetaAttribued = await prisma.sale.count({
      where: {
        organizationId,
        status: 'completed',
        createdAt: {
          gte: date,
          lt: new Date(date.getTime() + 86400000),
        },
        deal: {
          tracking: {
            ctwaclid: { not: null },
          },
        },
      },
    })

    // 7. Upsert main metric
    await prisma.dashboardDailyMetric.upsert({
      where: {
        organizationId_projectId_date: {
          organizationId,
          projectId: null,
          date: date,
        },
      },
      create: {
        organizationId,
        projectId: null,
        date: date,
        revenueCompleted,
        revenuePending,
        revenuePipeline,
        metaPaidSpend,
        metaPaidRevenue,
        metaPaidClicks,
        metaPaidImpressions,
        leadsTotal,
        leadsMetaPaid,
        salesTotal,
        salesMetaAttribued,
      },
      update: {
        revenueCompleted,
        revenuePending,
        revenuePipeline,
        metaPaidSpend,
        metaPaidRevenue,
        metaPaidClicks,
        metaPaidImpressions,
        leadsTotal,
        leadsMetaPaid,
        salesTotal,
        salesMetaAttribued,
        lastProjectedAt: new Date(),
      },
    })

    // 8. Project by origin (UTM)
    await this.projectOriginMetrics(organizationId, date)

    // 9. Project by Meta entity
    await this.projectMetaEntityMetrics(organizationId, date)
  }

  private async projectOriginMetrics(organizationId: string, date: Date) {
    // Get unique origin combinations from deals
    const originGroups = await prisma.dealTracking.findMany({
      distinct: ['utmSource', 'utmMedium', 'utmCampaign'],
      where: {
        deal: {
          organizationId,
          createdAt: {
            gte: date,
            lt: new Date(date.getTime() + 86400000),
          },
        },
      },
      select: {
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
      },
    })

    for (const origin of originGroups) {
      const originKey = this.generateOriginKey(origin)

      const sales = await prisma.sale.aggregate({
        where: {
          organizationId,
          status: 'completed',
          createdAt: {
            gte: date,
            lt: new Date(date.getTime() + 86400000),
          },
          deal: {
            tracking: {
              utmSource: origin.utmSource,
              utmMedium: origin.utmMedium,
              utmCampaign: origin.utmCampaign,
            },
          },
        },
        _sum: { totalAmount: true },
      })

      const leadsCount = await prisma.lead.count({
        where: {
          organizationId,
          createdAt: {
            gte: date,
            lt: new Date(date.getTime() + 86400000),
          },
          deals: {
            some: {
              tracking: {
                utmSource: origin.utmSource,
                utmMedium: origin.utmMedium,
                utmCampaign: origin.utmCampaign,
              },
            },
          },
        },
      })

      const salesCount = await prisma.sale.count({
        where: {
          organizationId,
          status: 'completed',
          createdAt: {
            gte: date,
            lt: new Date(date.getTime() + 86400000),
          },
          deal: {
            tracking: {
              utmSource: origin.utmSource,
              utmMedium: origin.utmMedium,
              utmCampaign: origin.utmCampaign,
            },
          },
        },
      })

      await prisma.dashboardOriginDailyMetric.upsert({
        where: {
          organizationId_projectId_date_originKey: {
            organizationId,
            projectId: null,
            date: date,
            originKey,
          },
        },
        create: {
          organizationId,
          projectId: null,
          date: date,
          originKey,
          utmSource: origin.utmSource,
          utmMedium: origin.utmMedium,
          utmCampaign: origin.utmCampaign,
          leadsCount,
          salesCount,
          revenue: Number(sales._sum.totalAmount || 0),
        },
        update: {
          leadsCount,
          salesCount,
          revenue: Number(sales._sum.totalAmount || 0),
        },
      })
    }
  }

  private async projectMetaEntityMetrics(organizationId: string, date: Date) {
    // Get all Meta insights for this org/date
    const metaInsights = await prisma.metaAdInsightDaily.findMany({
      where: {
        organizationId,
        date: date,
      },
    })

    for (const insight of metaInsights) {
      // Get attributions
      const sales = await prisma.sale.aggregate({
        where: {
          organizationId,
          status: 'completed',
          createdAt: {
            gte: date,
            lt: new Date(date.getTime() + 86400000),
          },
          deal: {
            tracking: {
              metaAdId: insight.metaAdId,
            },
          },
        },
        _sum: { totalAmount: true },
      })

      const leadsCount = await prisma.lead.count({
        where: {
          organizationId,
          createdAt: {
            gte: date,
            lt: new Date(date.getTime() + 86400000),
          },
          deals: {
            some: {
              tracking: {
                metaAdId: insight.metaAdId,
              },
            },
          },
        },
      })

      await prisma.dashboardMetaEntityDailyMetric.upsert({
        where: {
          organizationId_projectId_date_entityKey: {
            organizationId,
            projectId: null,
            date: date,
            entityKey: insight.entityKey,
          },
        },
        create: {
          organizationId,
          projectId: null,
          date: date,
          metaCampaignId: insight.metaCampaignId,
          metaAdSetId: insight.metaAdSetId,
          metaAdId: insight.metaAdId,
          entityKey: insight.entityKey,
          spend: insight.spend,
          clicks: insight.clicks,
          impressions: insight.impressions,
          leadsAttribued: leadsCount,
          revenue: Number(sales._sum.totalAmount || 0),
        },
        update: {
          spend: insight.spend,
          clicks: insight.clicks,
          impressions: insight.impressions,
          leadsAttribued: leadsCount,
          revenue: Number(sales._sum.totalAmount || 0),
        },
      })
    }
  }

  private generateOriginKey(origin: {
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
  }): string {
    const parts = [
      origin.utmSource || 'direct',
      origin.utmMedium || 'none',
      origin.utmCampaign || 'none',
    ]
    return parts.join(':')
  }
}

export const dashboardDailyProjector = new DashboardDailyProjector()
