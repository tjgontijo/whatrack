'use client'

import * as React from 'react'
import type { ComponentType } from 'react'
import type { ComputedDatum } from '@nivo/pie'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

type PieComponentProps = {
  data: DashboardPieDatum[]
  [key: string]: unknown
}

const ResponsivePie = dynamic(() => import('@nivo/pie').then((mod) => mod.ResponsivePie), {
  ssr: false,
}) as ComponentType<PieComponentProps>

type NativePieProps = React.ComponentProps<typeof ResponsivePie>

export interface DashboardPieDatum {
  id: string
  label: string
  value: number
  color?: string
}

export interface DashboardPieChartProps {
  data: DashboardPieDatum[]
  className?: string
  height?: number
  emptyMessage?: string
  colors?: NativePieProps['colors']
  margin?: NativePieProps['margin']
  innerRadius?: number
  padAngle?: number
  cornerRadius?: number
  activeOuterRadiusOffset?: number
}

export function DashboardPieChart({
  data,
  className,
  height = 360,
  emptyMessage = 'Sem dados suficientes para exibir o gráfico.',
  colors = { scheme: 'paired' },
  margin = { top: 32, right: 48, bottom: 32, left: 48 },
  innerRadius = 0.5,
  padAngle = 0.6,
  cornerRadius = 2,
  activeOuterRadiusOffset = 8,
}: DashboardPieChartProps) {
  const chartData = React.useMemo(() => data.filter((item) => item.value > 0), [data])
  const totalValue = React.useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData])

  if (!chartData.length) {
    return (
      <div className={cn('flex w-full items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10 p-6 text-sm text-muted-foreground', className)} style={{ minHeight: `${Math.max(height, 240)}px` }}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('w-full rounded-2xl border border-border/50 bg-card p-4 shadow-sm', className)} style={{ height }}>
      <div className="h-full w-full [&_svg]:!bg-transparent">
        <ResponsivePie
          data={chartData}
          margin={margin}
          innerRadius={innerRadius}
          padAngle={padAngle}
          cornerRadius={cornerRadius}
          activeOuterRadiusOffset={activeOuterRadiusOffset}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="hsl(var(--foreground))"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
          colors={colors}
          theme={{
            background: 'transparent',
            labels: {
              text: {
                fill: 'hsl(var(--foreground))',
                fontSize: 12,
              },
            },
            legends: {
              text: {
                fill: 'hsl(var(--foreground))',
                fontSize: 12,
              },
            },
          }}
          tooltip={({ datum }: { datum: ComputedDatum<DashboardPieDatum> }) => (
            <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 text-xs shadow-lg">
              <p className="font-semibold text-popover-foreground">{datum.label}</p>
              <p className="text-popover-foreground/80">{formatCurrencyBRL(datum.value)}</p>
              <p className="text-muted-foreground">
                {totalValue > 0 ? ((datum.value / totalValue) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
          )}
        />
      </div>
    </div>
  )
}
