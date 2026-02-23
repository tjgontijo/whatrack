import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { dashboardSummaryResponseSchema } from '@/schemas/dashboard-summary'
import { buildSalesWhere, resolveFiltersDateRange, type SummaryFilters } from '@/services/dashboard/buildFilters'
import { buildFinancialSummary } from '@/services/dashboard/buildFinancialSummary'
import { buildSalesByService } from '@/services/dashboard/buildSalesByService'
import { buildFunnel } from '@/services/dashboard/buildFunnel'
import { buildOriginsSummary } from '@/services/dashboard/buildOrigins'
import { buildPaidCampaignsSummary } from '@/services/dashboard/buildPaidCampaigns'
import { buildItemFilters } from '@/services/dashboard/buildItemFilters'
import { buildItemsCost } from '@/services/dashboard/buildItemsCost'

const summaryQuerySchema = z.object({
  period: z.string().default('7d'),
  trafficSource: z.string().default('any'),
  trafficType: z.string().default('any'),
  item: z.string().default('any'),
})

export async function GET(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = summaryQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const filters: SummaryFilters = {
    period: parsed.data.period,
    trafficSource: parsed.data.trafficSource,
    trafficType: parsed.data.trafficType,
    item: parsed.data.item,
  }

  const dateRange = resolveFiltersDateRange(filters)
  const salesWhereFromFilters = buildSalesWhere(filters)
  const salesWhere =
    Object.keys(salesWhereFromFilters).length > 0
      ? {
          AND: [{ organizationId: access.organizationId }, { status: 'completed' }, salesWhereFromFilters],
        }
      : { organizationId: access.organizationId, status: 'completed' }

  try {
    const [salesAggregate, costs, salesByService, funnelBase, origins, paidCampaigns, itemFilters] =
      await Promise.all([
        prisma.sale.aggregate({
          where: salesWhere,
          _sum: { totalAmount: true },
          _count: { _all: true },
        }),
        buildItemsCost(salesWhere),
        buildSalesByService(access.organizationId, dateRange),
        buildFunnel(access.organizationId, dateRange),
        buildOriginsSummary(access.organizationId, dateRange),
        buildPaidCampaignsSummary(access.organizationId, dateRange),
        buildItemFilters(access.organizationId),
      ])

    const [trafficSourcesRaw, trafficTypesRaw] = await Promise.all([
      prisma.ticketTracking.findMany({
        where: {
          ticket: { organizationId: access.organizationId },
        },
        distinct: ['utmSource'],
        select: { utmSource: true },
      }),
      prisma.ticketTracking.findMany({
        where: {
          ticket: { organizationId: access.organizationId },
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

    const payload = dashboardSummaryResponseSchema.parse({
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

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/dashboard/summary] GET error:', error)
    return NextResponse.json({ error: 'Falha ao gerar resumo' }, { status: 500 })
  }
}
