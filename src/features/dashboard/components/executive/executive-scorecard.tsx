import { Banknote, MousePointerClick, ShoppingCart, Target, TrendingUp, Users } from 'lucide-react'
import type { ExecutiveScorecardMetrics } from '@/features/dashboard/services/executive-scorecard.service'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import { cn } from '@/lib/utils/utils'

interface ExecutiveScorecardProps {
  metrics: ExecutiveScorecardMetrics
  isLoading?: boolean
}

export function ExecutiveScorecard({ metrics, isLoading }: ExecutiveScorecardProps) {
  const formatInteger = (value: number) => new Intl.NumberFormat('pt-BR').format(value)
  const formatRatio = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}x`)
  const formatPercentage = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`)
  const roasMeta =
    metrics.metaPaidSpend > 0 ? metrics.metaPaidRevenue / metrics.metaPaidSpend : null
  const cacMeta =
    metrics.salesMetaAttribued > 0 ? metrics.metaPaidSpend / metrics.salesMetaAttribued : null
  const cpc = metrics.metaPaidClicks > 0 ? metrics.metaPaidSpend / metrics.metaPaidClicks : null
  const averageTicket =
    metrics.salesTotal > 0 ? metrics.revenueCompleted / metrics.salesTotal : null
  const leadToSaleRate =
    metrics.leadsTotal > 0 ? (metrics.salesTotal / metrics.leadsTotal) * 100 : null

  const primaryCards = [
    {
      label: 'Receita realizada',
      value: formatCurrencyBRL(metrics.revenueCompleted),
      helper: `Ticket médio ${averageTicket === null ? '—' : formatCurrencyBRL(averageTicket)}`,
      icon: Banknote,
    },
    {
      label: 'Pipeline',
      value: formatCurrencyBRL(metrics.revenuePipeline),
      helper: 'Valor em negociação',
      icon: TrendingUp,
    },
    {
      label: 'Leads',
      value: formatInteger(metrics.leadsTotal),
      helper: 'Entradas capturadas',
      icon: Users,
    },
    {
      label: 'Vendas',
      value: formatInteger(metrics.salesTotal),
      helper: `Conversão ${formatPercentage(leadToSaleRate)}`,
      icon: ShoppingCart,
    },
  ]

  const metaStats = [
    { label: 'Investimento', value: formatCurrencyBRL(metrics.metaPaidSpend), icon: Target },
    { label: 'ROAS', value: formatRatio(roasMeta), icon: TrendingUp },
    { label: 'CAC', value: cacMeta === null ? '—' : formatCurrencyBRL(cacMeta), icon: Banknote },
    { label: 'CPC', value: cpc === null ? '—' : formatCurrencyBRL(cpc), icon: MousePointerClick },
  ]

  return (
    <div className='space-y-4'>
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        {primaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={cn(
                'rounded-lg border border-border/60 bg-card p-4 shadow-sm',
                isLoading && 'animate-pulse'
              )}
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1'>
                  <p className='font-medium text-muted-foreground text-sm'>{card.label}</p>
                  <p className='mt-2 font-semibold text-2xl text-foreground tracking-tight'>
                    {isLoading ? '—' : card.value}
                  </p>
                  <p className='mt-1 text-muted-foreground text-xs'>{card.helper}</p>
                </div>
                <Icon className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70' />
              </div>
            </div>
          )
        })}
      </div>

      <div className='rounded-lg border border-border/60 bg-card p-4 shadow-sm'>
        <div className='flex flex-col gap-1 border-border/60 border-b pb-3 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='font-semibold text-foreground text-sm'>Aquisição paga</h2>
            <p className='text-muted-foreground text-xs'>
              Custo e eficiência dos anúncios no período selecionado
            </p>
          </div>
          <p className='text-muted-foreground text-xs'>
            {formatInteger(metrics.metaPaidClicks)} cliques ·{' '}
            {formatInteger(metrics.metaPaidImpressions)} impressões
          </p>
        </div>

        <div className='grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-4'>
          {metaStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className='flex min-w-0 items-center gap-3 rounded-md border border-border/60 bg-background p-3'
              >
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
                  <Icon className='h-4 w-4' />
                </div>
                <div className='min-w-0'>
                  <p className='truncate text-muted-foreground text-xs'>{stat.label}</p>
                  <p className='truncate font-semibold text-foreground text-lg tracking-tight'>
                    {isLoading ? '—' : stat.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
