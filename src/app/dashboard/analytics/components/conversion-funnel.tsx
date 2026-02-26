'use client'

import { useQuery } from '@tanstack/react-query'
import { ResponsiveFunnel } from '@nivo/funnel'

export default function ConversionFunnel({
  startDate,
  endDate,
}: {
  startDate: string
  endDate: string
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'conversion', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/analytics/conversion?startDate=${startDate}&endDate=${endDate}`
      )
      if (!res.ok) throw new Error('Falha ao buscar funil')
      return res.json()
    },
  })

  if (isLoading) return <div className="bg-card h-full w-full animate-pulse rounded-xl border" />
  if (error || !data)
    return (
      <div className="bg-card text-muted-foreground flex h-full w-full items-center justify-center rounded-xl border p-4 text-sm">
        Funil não disponível
      </div>
    )

  const funnelData = data.stageOverview.map((stage: any) => ({
    id: stage.stage_name,
    value: stage.ticket_count,
    label: stage.stage_name,
  }))

  return (
    <div className="bg-card flex h-full w-full flex-col overflow-hidden rounded-xl border p-4 shadow-sm">
      <h3 className="text-foreground mb-4 text-base font-semibold">Funil de Vendas</h3>
      <div className="bg-background/50 min-h-0 flex-1 rounded-md">
        <ResponsiveFunnel
          data={funnelData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          valueFormat=">-.0f"
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
          motionConfig="wobbly"
        />
      </div>
    </div>
  )
}
