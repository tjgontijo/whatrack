import { Banknote, Eye, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import type { ExecutiveScorecardMetrics } from '@/features/dashboard/services/executive-scorecard.service'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

interface ExecutiveScorecardProps {
  metrics: ExecutiveScorecardMetrics
  isLoading?: boolean
}

export function ExecutiveScorecard({ metrics, isLoading }: ExecutiveScorecardProps) {
  const skeletonClass = isLoading ? 'animate-pulse bg-slate-200' : ''

  const cards = [
    {
      label: 'Receita Realizada',
      value: formatCurrencyBRL(metrics.revenueCompleted),
      icon: Banknote,
      variant: 'success',
    },
    {
      label: 'Pipeline de Receita',
      value: formatCurrencyBRL(metrics.revenuePipeline),
      icon: TrendingUp,
      variant: 'info',
    },
    {
      label: 'Investimento Meta',
      value: formatCurrencyBRL(metrics.metaPaidSpend),
      icon: ShoppingCart,
      variant: 'warning',
    },
    {
      label: 'Receita Meta',
      value: formatCurrencyBRL(metrics.metaPaidRevenue),
      icon: Banknote,
      variant: 'success',
    },
    {
      label: 'Leads Total',
      value: metrics.leadsTotal.toString(),
      icon: Users,
      variant: 'info',
    },
    {
      label: 'Leads Meta',
      value: metrics.leadsMetaPaid.toString(),
      icon: Users,
      variant: 'info',
    },
    {
      label: 'Vendas Total',
      value: metrics.salesTotal.toString(),
      icon: ShoppingCart,
      variant: 'success',
    },
    {
      label: 'Vendas Meta',
      value: metrics.salesMetaAttribued.toString(),
      icon: ShoppingCart,
      variant: 'success',
    },
  ]

  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'border-l-4 border-l-green-500 bg-green-50'
      case 'warning':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50'
      case 'info':
        return 'border-l-4 border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-4 border-l-slate-300 bg-slate-50'
    }
  }

  const getIconColor = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'info':
        return 'text-blue-600'
      default:
        return 'text-slate-600'
    }
  }

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold text-slate-900'>Scorecard Executivo</h3>
        <p className='text-sm text-slate-500'>Métricas principais de receita e meta ads</p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`rounded-lg border p-4 transition-all ${getVariantColor(card.variant)} ${skeletonClass}`}
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-slate-600'>{card.label}</p>
                  <p className='mt-2 text-2xl font-bold text-slate-900'>{card.value}</p>
                </div>
                <Icon className={`h-5 w-5 ${getIconColor(card.variant)}`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary cards for ROAS and efficiency metrics */}
      <div className='mt-6 grid gap-4 md:grid-cols-2'>
        <div className='rounded-lg border border-l-4 border-l-purple-500 bg-purple-50 p-4'>
          <p className='text-sm font-medium text-slate-600'>ROAS Meta</p>
          <p className='mt-2 text-2xl font-bold text-slate-900'>
            {metrics.metaPaidSpend > 0
              ? (metrics.metaPaidRevenue / metrics.metaPaidSpend).toFixed(2)
              : '—'}
            x
          </p>
          <p className='text-xs text-slate-500'>Retorno por Real Investido</p>
        </div>

        <div className='rounded-lg border border-l-4 border-l-indigo-500 bg-indigo-50 p-4'>
          <p className='text-sm font-medium text-slate-600'>Impressões Meta</p>
          <p className='mt-2 text-2xl font-bold text-slate-900'>
            {(metrics.metaPaidImpressions / 1000).toFixed(0)}k
          </p>
          <p className='text-xs text-slate-500'>Total de visualizações</p>
        </div>
      </div>
    </div>
  )
}
