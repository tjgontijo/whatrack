'use client'

import React from 'react'
import { ResponsiveFunnel } from '@nivo/funnel'
import { cn } from '@/lib/utils/utils'

type FunnelStep = {
  label: string
  value: number
  helper?: React.ReactNode
}

type FunnelChartProps = {
  steps: FunnelStep[]
  className?: string
  title?: string
  description?: string
  colors?: any
}

export function FunnelChart({ 
  steps, 
  className,
  title = "Funil de Conversão",
  description,
  colors = { scheme: 'spectral' }
}: FunnelChartProps) {
  const formatInteger = (value: number) => new Intl.NumberFormat('pt-BR').format(value)
  const firstValue = steps[0]?.value ?? 0
  
  const data = steps.map((step, index) => {
    const previousValue = steps[index - 1]?.value ?? step.value
    const hasPrev = index > 0
    const conversionPrev = hasPrev && previousValue > 0 ? (step.value / previousValue) * 100 : -1
    const conversionFromStart = hasPrev && firstValue > 0 ? (step.value / firstValue) * 100 : -1

    return {
      id: step.label,
      label: step.label,
      value: step.value,
      conversionPrev,
      conversionFromStart,
    }
  })

  return (
    <section
      className={cn(
        'border-border/60 bg-card flex h-full flex-col gap-4 rounded-3xl border p-6 shadow-[0px_18px_35px_-25px_rgba(15,23,42,0.25)] backdrop-blur-sm',
        className
      )}
    >
      <header className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-foreground text-sm font-semibold">{title}</p>
          {description && (
            <p className="text-muted-foreground/70 text-xs mt-1">
              {description}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col pt-4">
        <div className="flex-1 min-h-0">
          <ResponsiveFunnel
            data={data}
            margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
            direction="horizontal"
            valueFormat={(value) => formatInteger(value as number)}
            colors={colors}
            borderWidth={12}
            labelColor={{ from: 'color', modifiers: [['darker', 3]] }}
            beforeSeparatorLength={32}
            beforeSeparatorOffset={12}
            afterSeparatorLength={32}
            afterSeparatorOffset={12}
            currentPartSizeExtension={4}
            currentBorderWidth={16}
            motionConfig="gentle"
            theme={{
              labels: {
                text: {
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600
                },
              },
            }}
            tooltip={({ part }) => (
              <div className="border-border/70 bg-popover min-w-[200px] rounded-xl border px-3 py-2 text-xs shadow-lg">
                <p className="text-popover-foreground font-semibold">{part.data.label}</p>
                <p className="text-popover-foreground/80">Valor: {formatInteger(part.data.value)}</p>
                {Number(part.data.conversionPrev ?? -1) >= 0 ? (
                  <p className="text-muted-foreground">
                    Vs etapa anterior: {Number(part.data.conversionPrev).toFixed(1)}%
                  </p>
                ) : null}
              </div>
            )}
          />
        </div>
        
        {/* Row of Percentages relative to start */}
        <div className="flex justify-around items-center pt-2 px-10 border-t border-border/40 mt-2">
          {data.map((item, idx) => (
            <div key={item.id} className="flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{item.id}</span>
              <span className="text-xs font-extrabold text-foreground">
                {idx === 0 ? '100%' : `${item.conversionFromStart.toFixed(1)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
