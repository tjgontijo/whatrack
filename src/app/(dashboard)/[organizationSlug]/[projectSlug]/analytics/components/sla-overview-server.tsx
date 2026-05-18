import { getSlaMetrics } from '@/features/analytics/server'
import SlaOverviewClient from './sla-overview'

export async function SlaOverview({
  organizationId,
  startDate,
  endDate,
}: {
  organizationId: string
  startDate: Date
  endDate: Date
}) {
  const data = await getSlaMetrics(organizationId, startDate, endDate)
  return <SlaOverviewClient initialData={data} startDate={startDate.toISOString()} endDate={endDate.toISOString()} />
}
