'use client'

import { useQuery } from '@tanstack/react-query'
import { ResponsiveBar } from '@nivo/bar'

export default function SlaOverview({
  startDate,
  endDate,
}: {
  startDate: string
  endDate: string
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'sla', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/sla?startDate=${startDate}&endDate=${endDate}`)
      if (!res.ok) throw new Error('Falha ao buscar SLA')
      return res.json()
    },
  })

  if (isLoading) return <div className="bg-card h-full w-full animate-pulse rounded-xl border" />
  if (error || !data)
    return (
      <div className="bg-card text-muted-foreground flex h-full w-full items-center justify-center rounded-xl border p-4 text-sm">
        Visão de SLA não disponível
      </div>
    )

  const barData = data.distribution.map((d: any) => ({
    bucket: d.bucket,
    Tíquetes: d.count,
  }))

  return (
    <div className="bg-card flex h-full w-full flex-col overflow-hidden rounded-xl border p-4 shadow-sm">
      <h3 className="text-foreground mb-4 text-base font-semibold">Tempo da 1ª Resposta (SLA)</h3>
      <div className="bg-background/50 min-h-0 flex-1 rounded-md">
        <ResponsiveBar
          data={barData}
          keys={['Tíquetes']}
          indexBy="bucket"
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
          role="application"
        />
      </div>
    </div>
  )
}
