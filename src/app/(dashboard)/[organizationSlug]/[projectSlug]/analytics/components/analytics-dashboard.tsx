import { Suspense } from 'react'
import { ConversionFunnel } from './conversion-funnel-server'
import { SlaOverview } from './sla-overview-server'
import HeatmapHours from './heatmap-hours'
import EfficiencyChart from './efficiency-chart'
import LeadActivity from './lead-activity'
import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsDashboard({
  organizationId,
  startDate,
  endDate,
}: {
  organizationId: string
  startDate: Date
  endDate: Date
}) {
  const startDateStr = startDate.toISOString()
  const endDateStr = endDate.toISOString()

  return (
    <div className='flex flex-col gap-6'>
      {/* Grids superiores - Granular Streaming Pilot */}
      <div className='grid h-[500px] grid-cols-1 gap-6 md:grid-cols-2'>
        <Suspense fallback={<AnalyticsCardSkeleton title="Funil de Vendas" />}>
           <ConversionFunnel organizationId={organizationId} startDate={startDate} endDate={endDate} />
        </Suspense>
        <Suspense fallback={<AnalyticsCardSkeleton title="Tempo da 1ª Resposta (SLA)" />}>
           <SlaOverview organizationId={organizationId} startDate={startDate} endDate={endDate} />
        </Suspense>
      </div>

      <div className='grid h-96 grid-cols-1 gap-6 md:grid-cols-2'>
        <HeatmapHours startDate={startDateStr} endDate={endDateStr} />
        <EfficiencyChart startDate={startDateStr} endDate={endDateStr} />
      </div>

      <div className='grid grid-cols-1'>
        <LeadActivity />
      </div>
    </div>
  )
}

function AnalyticsCardSkeleton({ title }: { title: string }) {
  return (
    <div className='flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm'>
      <h3 className='mb-4 font-semibold text-base text-foreground'>{title}</h3>
      <Skeleton className='flex-1 w-full rounded-md bg-muted/50' />
    </div>
  )
}
