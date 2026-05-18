'use client'

import { ResponsiveFunnel } from '@nivo/funnel'
import { useQuery } from '@tanstack/react-query'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { apiFetch } from '@/lib/http/api-client'

export default function ConversionFunnel({
  startDate,
  endDate,
  initialData,
}: {
  startDate: string
  endDate: string
  initialData?: any
}) {
  const { organizationId } = useRequiredProjectRouteContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'conversion', organizationId, startDate, endDate],
    queryFn: async () => {
      const data = await apiFetch(
        `/api/v1/analytics/conversion?startDate=${startDate}&endDate=${endDate}`,
        { orgId: organizationId }
      )
      return data
    },
    initialData,
    enabled: !!organizationId && !initialData,
  })

  if (isLoading) return <div className='h-full w-full animate-pulse rounded-xl border bg-card' />
  if (error || !data)
    return (
      <div className='flex h-full w-full items-center justify-center rounded-xl border bg-card p-4 text-muted-foreground text-sm'>
        Funil não disponível
      </div>
    )

  const funnelData = data.stageOverview.map((stage: any) => ({
    id: stage.stage_name,
    value: stage.ticket_count,
    label: stage.stage_name,
  }))

  return (
    <div className='flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm'>
      <h3 className='mb-4 font-semibold text-base text-foreground'>Funil de Vendas</h3>
      <div className='min-h-0 flex-1 rounded-md bg-background/50'>
        <ResponsiveFunnel
          data={funnelData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          valueFormat='>-.0f'
          colors={{ scheme: 'nivo' }}
          borderWidth={20}
          labelColor={{
            from: 'color',
            modifiers: [['darker', 3]],
          }}
          beforeSeparatorLength={100}
          beforeSeparatorOffset={20}
          afterSeparatorLength={100}
          afterSeparatorOffset={20}
          currentPartSizeExtension={10}
          currentBorderWidth={40}
          motionConfig='wobbly'
        />
      </div>
    </div>
  )
}
