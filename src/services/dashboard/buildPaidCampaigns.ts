import { DateRange } from '@/lib/date/dateRange'

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
  _organizationId: string,
  _dateRange?: DateRange,
): Promise<PaidCampaignSummary[]> {
  return []
}
