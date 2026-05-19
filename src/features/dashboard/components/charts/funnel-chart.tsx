'use client'

import { ResponsiveFunnel } from '@nivo/funnel'
import type React from 'react'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import { cn } from '@/lib/utils/utils'

type FunnelStep = {
  label: string
  value: number
  currentValue?: number
  dealValueSum?: number
  currentDealValueSum?: number
  color?: string
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
  title = 'Funil de Conversão',
  description,
  colors = { scheme: 'spectral' },
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
      currentValue: step.currentValue ?? 0,
      dealValueSum: step.dealValueSum ?? 0,
      currentDealValueSum: step.currentDealValueSum ?? 0,
      color: step.color ?? '#6366f1',
      conversionPrev,
      conversionFromStart,
    }
  })

  const hasData = data.length >= 2 || (data.length === 1 && data[0].value > 0)

  const isDefaultColors = typeof colors === 'object' && colors !== null && 'scheme' in colors && colors.scheme === 'spectral'
  const resolvedColors = isDefaultColors && data.some((d) => d.color)
    ? data.map((d) => d.color || '#6366f1')
    : colors

  return (
    <section
      className={cn(
        'flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-[0px_18px_35px_-25px_rgba(15,23,42,0.25)] backdrop-blur-sm',
        className
      )}
    >
      <header className='flex shrink-0 items-center justify-between'>
        <div>
          <p className='font-semibold text-foreground text-sm'>{title}</p>
          {description && <p className='mt-1 text-muted-foreground/70 text-xs'>{description}</p>}
        </div>
      </header>

      <div className='flex min-h-0 flex-1 flex-col pt-4'>
        <div className='min-h-0 flex-1'>
          {!hasData ? (
            <div className='flex h-full items-center justify-center text-muted-foreground text-sm'>
              Sem dados suficientes para exibir o funil.
            </div>
          ) : (
            <ResponsiveFunnel
              data={data}
              margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
              direction='horizontal'
              valueFormat={(value) => formatInteger(value as number)}
              colors={resolvedColors}
              borderWidth={12}
              labelColor={{ from: 'color', modifiers: [['darker', 3]] }}
              beforeSeparatorLength={32}
              beforeSeparatorOffset={12}
              afterSeparatorLength={32}
              afterSeparatorOffset={12}
              currentPartSizeExtension={4}
              currentBorderWidth={16}
              motionConfig='gentle'
              theme={{
                labels: {
                  text: {
                    fontSize: 12,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                  },
                },
              }}
              tooltip={({ part }) => {
                const dealValueSum = Number(part.data.dealValueSum ?? 0)
                const currentValue = Number(part.data.currentValue ?? 0)
                const currentDealValueSum = Number(part.data.currentDealValueSum ?? 0)

                return (
                  <div className='min-w-[240px] rounded-xl border border-border/70 bg-popover px-4 py-3 text-xs shadow-lg'>
                    <p className='mb-2 font-bold text-popover-foreground text-sm'>{part.data.label}</p>
                    <div className='space-y-1.5'>
                      <div className='flex justify-between gap-4'>
                        <span className='text-muted-foreground'>Passaram por aqui:</span>
                        <div className='flex flex-col items-end'>
                          <span className='font-semibold text-popover-foreground'>
                            {formatInteger(part.data.value)}
                          </span>
                          {dealValueSum > 0 && (
                            <span className='font-medium text-[10px] text-muted-foreground'>
                              {formatCurrencyBRL(dealValueSum)}
                            </span>
                          )}
                        </div>
                      </div>
                      {currentValue > 0 && (
                        <div className='flex justify-between gap-4'>
                          <span className='text-muted-foreground'>Estão aqui agora:</span>
                          <div className='flex flex-col items-end'>
                            <span className='font-semibold text-popover-foreground text-primary'>
                              {formatInteger(currentValue)}
                            </span>
                            {currentDealValueSum > 0 && (
                              <span className='font-medium text-[10px] text-primary/70'>
                                {formatCurrencyBRL(currentDealValueSum)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className='border-border/50 border-t pt-1.5'>
                        {Number(part.data.conversionPrev ?? -1) >= 0 && (
                          <div className='flex justify-between gap-4'>
                            <span className='text-muted-foreground'>Vs. anterior:</span>
                            <span className='font-medium text-popover-foreground'>
                              {Number(part.data.conversionPrev).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {Number(part.data.conversionFromStart ?? -1) >= 0 && (
                          <div className='flex justify-between gap-4'>
                            <span className='text-muted-foreground'>Conversão total:</span>
                            <span className='font-medium text-popover-foreground'>
                              {Number(part.data.conversionFromStart).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }}
            />
          )}
        </div>

        {/* Row of Percentages relative to start */}
        <div className='mt-2 flex items-center justify-around border-border/40 border-t px-2 pt-4'>
          {data.map((item, idx) => (
            <div key={item.id} className='flex flex-col items-center px-2 text-center'>
              <span
                className='max-w-[80px] truncate font-bold text-[10px] text-muted-foreground uppercase tracking-tight'
                title={item.label}
              >
                {item.id}
              </span>
              <span className='font-extrabold text-foreground text-xs'>
                {idx === 0 ? '100%' : `${item.conversionFromStart.toFixed(1)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
