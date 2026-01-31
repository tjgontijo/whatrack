import { DateRange } from '@/lib/date/dateRange'

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
  _organizationId: string,
  _dateRange?: DateRange,
): Promise<OriginSummary[]> {
  return []
}
