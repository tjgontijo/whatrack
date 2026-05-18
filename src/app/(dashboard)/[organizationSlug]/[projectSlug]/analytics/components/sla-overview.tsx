'use client'

import { ResponsiveBar } from '@nivo/bar'
import { useQuery } from '@tanstack/react-query'

export default function SlaOverview({
  startDate,
  endDate,
  initialData,
}: {
  startDate: string
  endDate: string
  initialData?: any
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'sla', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/sla?startDate=${startDate}&endDate=${endDate}`)
      if (!res.ok) throw new Error('Falha ao buscar SLA')
      return res.json()
    },
    initialData,
    enabled: !initialData,
  })

  if (isLoading) return <div className='h-full w-full animate-pulse rounded-xl border bg-card' />
  if (error || !data)
    return (
      <div className='flex h-full w-full items-center justify-center rounded-xl border bg-card p-4 text-muted-foreground text-sm'>
        Visão de SLA não disponível
      </div>
    )

  const barData = data.distribution.map((d: any) => ({
    bucket: d.bucket,
    Tíquetes: d.count,
  }))

  return (
    <div className='flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm'>
      <h3 className='mb-4 font-semibold text-base text-foreground'>Tempo da 1ª Resposta (SLA)</h3>
      <div className='min-h-0 flex-1 rounded-md bg-background/50'>
        <ResponsiveBar
          data={barData}
          keys={['Tíquetes']}
          indexBy='bucket'
          margin={{ top: 10, right: 10, bottom: 40, left: 50 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'paired' }}
          defs={[]}
          fill={[]}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -15,
            legend: 'Tempo',
            legendPosition: 'middle',
            legendOffset: 32,
            truncateTickAt: 0,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Volume',
            legendPosition: 'middle',
            legendOffset: -40,
            truncateTickAt: 0,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          role='application'
        />
      </div>
    </div>
  )
}
