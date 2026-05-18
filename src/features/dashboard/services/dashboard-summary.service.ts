import type { DashboardSummaryQueryInput } from '@/features/dashboard/schemas/dashboard-schemas'
import { dashboardSummaryResponseSchema } from '@/features/dashboard/schemas/dashboard-summary'
import {
  buildSalesWhere,
  resolveFiltersDateRange,
  type SummaryFilters,
} from '@/features/dashboard/services/build-filters'
import { buildFinancialSummary } from '@/features/dashboard/services/build-financial-summary'
import { buildFunnel } from '@/features/dashboard/services/build-funnel'
import { buildItemFilters } from '@/features/dashboard/services/build-item-filters'
import { buildItemsCost } from '@/features/dashboard/services/build-items-cost'
import { buildOriginsSummary } from '@/features/dashboard/services/build-origins'
import { buildPaidCampaignsSummary } from '@/features/dashboard/services/build-paid-campaigns'
import { buildSalesByService } from '@/features/dashboard/services/build-sales-by-service'
import { prisma } from '@/lib/db/prisma'

export async function getDashboardSummary(
  organizationId: string,
  query: DashboardSummaryQueryInput,
  projectId?: string | null
) {
  const filters: SummaryFilters = {
    period: query.period,
    trafficSource: query.trafficSource,
    trafficType: query.trafficType,
    itemCategory: query.itemCategory,
    item: query.item,
    projectId: projectId ?? query.projectId ?? null,
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
      buildSalesByService(salesWhere),
      buildFunnel(organizationId, dateRange, filters.projectId),
      buildOriginsSummary(organizationId, dateRange),
      buildPaidCampaignsSummary(organizationId, dateRange),
      buildItemFilters(organizationId, filters.projectId),
    ])

  const [trafficSourcesRaw, trafficTypesRaw] = await Promise.all([
    prisma.ticketTracking.findMany({
      where: {
        ticket: {
          organizationId,
          ...(filters.projectId ? { projectId: filters.projectId } : {}),
        },
      },
      distinct: ['utmSource'],
      select: { utmSource: true },
    }),
    prisma.ticketTracking.findMany({
      where: {
        ticket: {
          organizationId,
          ...(filters.projectId ? { projectId: filters.projectId } : {}),
        },
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
