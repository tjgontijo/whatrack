import { Suspense } from 'react'
import { getConversionFunnel } from '@/features/analytics/server'
import ConversionFunnelClient from './conversion-funnel'

export async function ConversionFunnel({
  organizationId,
  startDate,
  endDate,
}: {
  organizationId: string
  startDate: Date
  endDate: Date
}) {
  const data = await getConversionFunnel(organizationId, startDate, endDate)
  return <ConversionFunnelClient initialData={data} startDate={startDate.toISOString()} endDate={endDate.toISOString()} />
}
