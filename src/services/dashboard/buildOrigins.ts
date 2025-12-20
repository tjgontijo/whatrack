import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { DateRange } from '@/lib/date/dateRange'
import { normalizeSourceLabel } from '@/lib/tracking/traffic'

export type OriginSummary = {
  label: string
  sourceType: string | null
  leads: number
  schedules: number
  attendances: number
  sales: number
  revenue: number
  cost: number
  roas: number | null
  cac: number | null
}

export async function buildOriginsSummary(
  organizationId: string,
  dateRange?: DateRange,
): Promise<OriginSummary[]> {
  const ticketWhere: Prisma.TicketWhereInput = { organizationId }

  if (dateRange) {
    ticketWhere.createdAt = { gte: dateRange.gte, lte: dateRange.lte }
  }

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere,
    select: {
      id: true,
      sourceType: true,
      campaignId: true,
      adsetId: true,
      whatsappConversation: {
        select: { leadId: true },
      },
      sales: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          totalAmount: true,
        },
      },
    },
  })

  const buckets = new Map<
    string,
    {
      sourceType: string | null
      label: string
      leadIds: Set<string>
      campaignIds: Set<string>
      schedules: number
      attendances: number
      sales: number
      revenue: number
    }
  >()

  for (const ticket of tickets) {
    const { key, label } = normalizeSourceLabel(ticket.sourceType)

    let bucket = buckets.get(key)

    if (!bucket) {
      bucket = {
        sourceType: ticket.sourceType ?? null,
        label,
        leadIds: new Set<string>(),
        campaignIds: new Set<string>(),
        schedules: 0,
        attendances: 0,
        sales: 0,
        revenue: 0,
      }
      buckets.set(key, bucket)
    }

    if (ticket.whatsappConversation?.leadId) {
      bucket.leadIds.add(ticket.whatsappConversation.leadId)
    }

    // Track campaign IDs for paid traffic
    if (ticket.campaignId && ticket.sourceType === 'paid') {
      bucket.campaignIds.add(ticket.campaignId)
    }

    for (const sale of ticket.sales) {
      const isCompleted = sale.status === 'completed'
      const saleInRange = !dateRange || (sale.createdAt >= dateRange.gte && sale.createdAt <= dateRange.lte)

      if (isCompleted && saleInRange) {
        bucket.sales += 1
        const numericAmount = sale.totalAmount ? Number(sale.totalAmount) : 0
        bucket.revenue += Number.isFinite(numericAmount) ? numericAmount : 0
      }
    }
  }

  const result: OriginSummary[] = []

  for (const bucket of buckets.values()) {
    const leads = bucket.leadIds.size

    // Cost data is no longer available (MetaAdsMetric model was removed)
    const cost = 0

    const roas = cost > 0 ? bucket.revenue / cost : null
    const cac = leads > 0 && cost > 0 ? cost / leads : null

    result.push({
      label: bucket.label,
      sourceType: bucket.sourceType,
      leads,
      schedules: bucket.schedules,
      attendances: bucket.attendances,
      sales: bucket.sales,
      revenue: bucket.revenue,
      cost,
      roas,
      cac,
    })
  }

  result.sort((a, b) => b.revenue - a.revenue)

  return result
}
