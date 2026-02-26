import { prisma } from '@/lib/db/prisma'
import { dashboardSummaryResponseSchema } from '@/schemas/dashboard/dashboard-summary'
import type { DashboardSummaryQueryInput } from '@/schemas/dashboard/dashboard-schemas'
import {
  buildSalesWhere,
  resolveFiltersDateRange,
  type SummaryFilters,
} from '@/services/dashboard/buildFilters'
import { buildFinancialSummary } from '@/services/dashboard/buildFinancialSummary'
import { buildSalesByService } from '@/services/dashboard/buildSalesByService'
import { buildFunnel } from '@/services/dashboard/buildFunnel'
import { buildOriginsSummary } from '@/services/dashboard/buildOrigins'
import { buildPaidCampaignsSummary } from '@/services/dashboard/buildPaidCampaigns'
import { buildItemFilters } from '@/services/dashboard/buildItemFilters'
import { buildItemsCost } from '@/services/dashboard/buildItemsCost'

export async function getDashboardSummary(
  organizationId: string,
  query: DashboardSummaryQueryInput
) {
  const filters: SummaryFilters = {
    period: query.period,
    trafficSource: query.trafficSource,
    trafficType: query.trafficType,
    item: query.item,
  }

  const dateRange = resolveFiltersDateRange(filters)
  const salesWhereFromFilters = buildSalesWhere(filters)
  const salesWhere =
    Object.keys(salesWhereFromFilters).length > 0
      ? {
          AND: [{ organizationId }, { status: 'completed' }, salesWhereFromFilters],
        }
      : { organizationId, status: 'completed' }

  const [salesAggregate, costs, salesByService, funnelBase, origins, paidCampaigns, itemFilters] =
    await Promise.all([
      prisma.sale.aggregate({
        where: salesWhere,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      buildItemsCost(salesWhere),
      buildSalesByService(organizationId, dateRange),
      buildFunnel(organizationId, dateRange),
      buildOriginsSummary(organizationId, dateRange),
      buildPaidCampaignsSummary(organizationId, dateRange),
      buildItemFilters(organizationId),
    ])

  const [trafficSourcesRaw, trafficTypesRaw] = await Promise.all([
    prisma.ticketTracking.findMany({
      where: {
        ticket: { organizationId },
      },
      distinct: ['utmSource'],
      select: { utmSource: true },
    }),
    prisma.ticketTracking.findMany({
      where: {
        ticket: { organizationId },
      },
      distinct: ['sourceType'],
      select: { sourceType: true },
    }),
  ])

  const totalRevenue = Number(salesAggregate._sum.totalAmount ?? 0)
  const salesCount = salesAggregate._count._all

  const financial = buildFinancialSummary({
    totalRevenue,
    salesCount,
    investment: 0,
    itemsCost: costs.cost,
    servicesCount: costs.servicesCount,
  })

  return dashboardSummaryResponseSchema.parse({
    netRevenue: financial.netRevenue,
    sales: salesCount,
    investment: financial.investment,
    servicesCount: financial.servicesCount,
    itemsCost: financial.itemsCost,
    grossProfit: financial.grossProfit,
    netProfit: financial.netProfit,
    roas: financial.roas,
    roi: financial.roi,
    returnOnInvestment: financial.returnOnInvestment,
    salesByService,
    trafficSources: trafficSourcesRaw.map((row) => row.utmSource),
    trafficTypes: ['any', ...trafficTypesRaw.map((row) => row.sourceType).filter(Boolean)],
    period: dateRange
      ? {
          gte: dateRange.gte.toISOString(),
          lte: dateRange.lte.toISOString(),
        }
      : null,
    cards: financial.cards,
    funnel: {
      ...funnelBase,
      sales: salesCount,
    },
    itemFilters,
    origins,
    paidCampaigns,
  })
}
