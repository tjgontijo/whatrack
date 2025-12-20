import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { DateRange } from '@/lib/date/dateRange'

export type PaidCampaignSummary = {
  campaignId: string | null
  adsetId: string | null
  adId: string | null
  campaign: string | null
  adset: string | null
  ad: string | null
  leads: number
  schedules: number
  attendances: number
  sales: number
  investment: number
  revenue: number
  profit: number
  roas: number | null
  cac: number | null
  conversion: number | null
}

export async function buildPaidCampaignsSummary(
  organizationId: string,
  dateRange?: DateRange,
): Promise<PaidCampaignSummary[]> {
  const ticketWhere: Prisma.TicketWhereInput = { sourceType: 'paid', organizationId }

  if (dateRange) {
    ticketWhere.createdAt = { gte: dateRange.gte, lte: dateRange.lte }
  }

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere,
    select: {
      id: true,
      campaignId: true,
      adsetId: true,
      adId: true,
      utmSource: true,
      utmCampaign: true,
      utmContent: true,
      utmTerm: true,
      whatsappConversation: {
        select: { leadId: true },
      },
      sales: {
        select: {
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
      campaignId: string
      adsetId: string
      adId: string
      campaign: string | null
      adset: string | null
      ad: string | null
      leadIds: Set<string>
      schedules: number
      attendances: number
      sales: number
      revenue: number
      investment: number
    }
  >()

  for (const ticket of tickets) {
    const campaignId = sanitizeId(ticket.campaignId)
    const adsetId = sanitizeId(ticket.adsetId)
    const adId = sanitizeId(ticket.adId)

    if (!campaignId || !adsetId || !adId) {
      continue
    }

    const key = buildCampaignKey({ campaignId, adsetId, adId })

    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        campaignId,
        adsetId,
        adId,
        campaign: null,
        adset: null,
        ad: null,
        leadIds: new Set<string>(),
        schedules: 0,
        attendances: 0,
        sales: 0,
        revenue: 0,
        investment: 0,
      }
      buckets.set(key, bucket)
    }

    if (!bucket.campaign) {
      bucket.campaign = sanitizeLabel(ticket.utmCampaign)
    }
    if (!bucket.adset) {
      bucket.adset = sanitizeLabel(ticket.utmContent)
    }
    if (!bucket.ad) {
      bucket.ad = sanitizeLabel(ticket.utmTerm)
    }

    if (ticket.whatsappConversation?.leadId) {
      bucket.leadIds.add(ticket.whatsappConversation.leadId)
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

  const result: PaidCampaignSummary[] = []

  for (const bucket of buckets.values()) {
    const leads = bucket.leadIds.size
    const investment = bucket.investment
    const revenue = bucket.revenue
    const conversion = leads > 0 ? (bucket.sales / leads) * 100 : null
    const roas = investment > 0 ? revenue / investment : null
    const profit = revenue - investment
    const cac = bucket.sales > 0 ? investment / bucket.sales : null

    result.push({
      campaignId: bucket.campaignId,
      adsetId: bucket.adsetId,
      adId: bucket.adId,
      campaign: bucket.campaign,
      adset: bucket.adset,
      ad: bucket.ad,
      leads,
      schedules: bucket.schedules,
      attendances: bucket.attendances,
      sales: bucket.sales,
      investment,
      revenue,
      profit,
      roas,
      cac,
      conversion,
    })
  }

  result.sort((a, b) => b.revenue - a.revenue)

  return result
}

function buildCampaignKey({ campaignId, adsetId, adId }: CampaignKeyParts) {
  return [campaignId, adsetId, adId].join('||')
}

function sanitizeLabel(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function sanitizeId(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

type CampaignKeyParts = {
  campaignId: string
  adsetId: string
  adId: string
}
