"use client"

import type { ReactNode } from 'react'

import { ResponsiveFunnel } from '@nivo/funnel'

import { cn } from '@/lib/utils'

type FunnelStep = {
  label: string
  value: number
  helper?: ReactNode
}

type FunnelChartProps = {
  steps: FunnelStep[]
  className?: string
}

export function FunnelChart({ steps, className }: FunnelChartProps) {
  const formatInteger = (value: number) => new Intl.NumberFormat('pt-BR').format(value)
  const firstValue = steps[0]?.value ?? 0
  const data = steps.map((step, index) => {
    const previousValue = steps[index - 1]?.value ?? step.value
    const hasPrev = index > 0
    const conversionPrev = hasPrev && previousValue > 0 ? (step.value / previousValue) * 100 : -1
    const conversionFromStart = hasPrev && firstValue > 0 ? (step.value / firstValue) * 100 : -1
    const helperText = typeof step.helper === 'string' ? step.helper : ''

    return {
      id: step.label,
      label: step.label,
      value: step.value,
      conversionPrev,
      conversionFromStart,
      helperText,
    }
  })

  return (
    <section
      className={cn(
        'flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-[0px_18px_35px_-25px_rgba(15,23,42,0.25)] backdrop-blur-sm',
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Funil Comercial</p>
          <p className="text-xs text-muted-foreground/70">Lead → Agendamento → Comparecimento → Venda</p>
        </div>
      </header>

      <div className="flex-1">
        <ResponsiveFunnel
          data={data}
          margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
          direction="horizontal"
          valueFormat={(value) => formatInteger(value as number)}
          colors={{ scheme: 'spectral' }}
          borderWidth={16}
          labelColor={{ from: 'color', modifiers: [['darker', 3]] }}
          beforeSeparatorLength={32}
          beforeSeparatorOffset={12}
          afterSeparatorLength={32}
          afterSeparatorOffset={12}
          currentPartSizeExtension={4}
          currentBorderWidth={20}
          motionConfig="gentle"
          theme={{
            labels: {
              text: {
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
              },
            },
          }}
          tooltip={({ part }) => (
            <div className="min-w-[220px] rounded-xl border border-border/70 bg-popover px-3 py-2 text-xs shadow-lg">
              <p className="font-semibold text-popover-foreground">{part.data.label}</p>
              <p className="text-popover-foreground/80">Valor: {formatInteger(part.data.value)}</p>
              {Number(part.data.conversionPrev ?? -1) >= 0 ? (
                <p className="text-muted-foreground">Vs etapa anterior: {Number(part.data.conversionPrev).toFixed(1)}%</p>
              ) : null}
              {Number(part.data.conversionFromStart ?? -1) >= 0 ? (
                <p className="text-muted-foreground">Desde o início: {Number(part.data.conversionFromStart).toFixed(1)}%</p>
              ) : null}
              {part.data.helperText ? (
                <div className="mt-1 text-[11px] text-muted-foreground">{part.data.helperText}</div>
              ) : null}
            </div>
          )}
        />
      </div>
    </section>
  )
}
