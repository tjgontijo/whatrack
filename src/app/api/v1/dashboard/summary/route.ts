import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { buildSalesByService } from '@/services/dashboard/buildSalesByService'
import { buildProductsCost } from '@/services/dashboard/buildProductsCost'
import { buildOriginsSummary, type OriginSummary } from '@/services/dashboard/buildOrigins'
import { buildPaidCampaignsSummary } from '@/services/dashboard/buildPaidCampaigns'
import { buildFunnel } from '@/services/dashboard/buildFunnel'
import { buildFinancialSummary } from '@/services/dashboard/buildFinancialSummary'
import { buildSalesWhere, resolveFiltersDateRange, type SummaryFilters } from '@/services/dashboard/buildFilters'
import { buildProductFilters } from '@/services/dashboard/buildProductFilters'
import type { DateRange } from '@/lib/date/dateRange'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { dashboardSummaryResponseSchema } from '@/schemas/dashboard-summary'


async function fetchInvestment(
  organizationId: string,
  dateRange: DateRange | undefined,
  trafficType: string | undefined,
) {
  if (trafficType === 'organic') {
    return 0
  }

  const where: Prisma.MetaAdsMetricWhereInput = { organizationId }
  if (dateRange) {
    where.reportDate = { gte: dateRange.gte, lte: dateRange.lte }
  }

  const aggregate = await prisma.metaAdsMetric.aggregate({
    where,
    _sum: { cost: true },
  })

  const sum = aggregate._sum.cost
  return sum ? Number(sum) : 0
}

async function fetchTrafficSources(organizationId: string) {
  const records = await prisma.ticket.findMany({
    select: { utmSource: true },
    where: { organizationId },
    distinct: ['utmSource'],
  })

  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })
  const set = new Set<string | null>()

  for (const record of records) {
    const trimmed = record.utmSource?.trim()
    set.add(trimmed && trimmed.length ? trimmed : null)
  }

  const values = Array.from(set)
  values.sort((a, b) => {
    if (a == null && b == null) return 0
    if (a == null) return -1
    if (b == null) return 1
    return collator.compare(a, b)
  })

  return values
}

// Cache por 5 minutos (300 segundos)
export const revalidate = 300

// Route é dinâmica (usa request.headers para autenticação)
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Validar acesso do usuário à organização
    const access = await validateFullAccess(request)
    if (!access.hasAccess) {
      return NextResponse.json({ error: access.error }, { status: 403 })
    }

    const organizationId = access.organizationId!

    const { searchParams } = new URL(request.url)
    const filters: SummaryFilters = {
      period: searchParams.get('period') ?? undefined,
      trafficSource: searchParams.get('trafficSource') ?? undefined,
      trafficType: searchParams.get('trafficType') ?? undefined,
      product: searchParams.get('product') ?? undefined,
    }

    const where = buildSalesWhere(filters)
    const dateRange = resolveFiltersDateRange(filters)

    console.info('[api/v1/dashboard/summary] filters', filters)
    console.info('[api/v1/dashboard/summary] where', JSON.stringify(where))

    const organizationWhere: Prisma.SaleWhereInput = { organizationId }
    const completedSalesWhere: Prisma.SaleWhereInput = Object.keys(where).length
      ? { AND: [organizationWhere, where, { status: 'completed' }] }
      : { AND: [organizationWhere, { status: 'completed' }] }

    const [
      sumResult,
      salesCount,
      investment,
      productsCostResult,
      serviceSlices,
      trafficSources,
      funnelSummary,
      productFilters,
      origins,
      paidCampaigns,
    ] =
      await Promise.all([
        prisma.sale.aggregate({ where: completedSalesWhere, _sum: { totalAmount: true } }),
        prisma.sale.count({ where: completedSalesWhere }),
        fetchInvestment(organizationId, dateRange, filters.trafficType),
        buildProductsCost(completedSalesWhere),
        buildSalesByService(organizationId, dateRange),
        fetchTrafficSources(organizationId),
        buildFunnel(organizationId, dateRange),
        buildProductFilters(organizationId),
        buildOriginsSummary(organizationId, dateRange),
        buildPaidCampaignsSummary(organizationId, dateRange),
      ])

    console.info('[api/v1/dashboard/summary] aggregate result', sumResult)
    console.info('[api/v1/dashboard/summary] sales count', salesCount)

    const netRevenue = sumResult._sum?.totalAmount ? Number(sumResult._sum.totalAmount) : 0
    const investmentValue = investment ?? 0
    const productsCostValue = productsCostResult?.cost ?? 0
    const servicesCount = productsCostResult?.servicesCount ?? 0

    const financial = buildFinancialSummary({
      totalRevenue: netRevenue,
      salesCount,
      investment: investmentValue,
      productsCost: productsCostValue,
      servicesCount,
    })

    const period = dateRange
      ? {
          gte: dateRange.gte.toISOString(),
          lte: dateRange.lte.toISOString(),
        }
      : null

    const funnel = {
      leads: funnelSummary.leads,
      schedules: funnelSummary.schedules,
      attendances: funnelSummary.attendances,
      sales: salesCount,
    }

    const trafficTypes = Array.from(
      new Set<string>(
        origins
          .map((origin: OriginSummary) => origin.sourceType)
          .filter((value): value is string => Boolean(value)),
      ),
    )

    if (!trafficTypes.includes('any')) {
      trafficTypes.unshift('any')
    }

    const payload = dashboardSummaryResponseSchema.parse({
      netRevenue: financial.netRevenue,
      sales: salesCount,
      investment: financial.investment,
      servicesCount: financial.servicesCount,
      productsCost: financial.productsCost,
      grossProfit: financial.grossProfit,
      netProfit: financial.netProfit,
      roas: financial.roas,
      roi: financial.roi,
      returnOnInvestment: financial.returnOnInvestment,
      salesByService: serviceSlices,
      trafficSources,
      trafficTypes,
      period,
      cards: financial.cards,
      funnel,
      productFilters,
      origins,
      paidCampaigns,
    })

    console.info('[api/v1/dashboard/summary] response payload', JSON.stringify(payload))

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/v1/dashboard/summary] GET error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard summary' }, { status: 500 })
  }
}
