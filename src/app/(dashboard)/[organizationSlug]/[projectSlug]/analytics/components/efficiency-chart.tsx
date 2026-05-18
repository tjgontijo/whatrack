'use client'

import { useQuery } from '@tanstack/react-query'

const _formatDealValue = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return '0,00'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue)
}

import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { apiFetch } from '@/lib/api-client'

export default function EfficiencyChart({
  startDate,
  endDate,
}: {
  startDate: string
  endDate: string
}) {
  const { organizationId } = useRequiredProjectRouteContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'efficiency', organizationId, startDate, endDate],
    queryFn: async () => {
      const data = await apiFetch(
        `/api/v1/analytics/efficiency?startDate=${startDate}&endDate=${endDate}`,
        { orgId: organizationId }
      )
      return data
    },
    enabled: !!organizationId,
  })

  if (isLoading) return <div className='h-full w-full animate-pulse rounded-xl border bg-card' />
  if (error || !data)
    return (
      <div className='flex h-full w-full items-center justify-center rounded-xl border bg-card p-4 text-muted-foreground text-sm'>
        Grafico de Eficiência não disponível
      </div>
    )

  const agg = data.aggregated?.[0] || {}

  return (
    <div className='flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm'>
      <h3 className='mb-4 font-semibold text-base text-foreground'>Esforço por Mensagem</h3>
      <div className='flex flex-1 flex-col justify-center gap-4 rounded-md bg-background/50 p-6'>
        <div className='flex flex-col gap-1 rounded-xl border bg-card p-4 text-center'>
          <span className='font-medium text-muted-foreground text-sm'>
            Valor arrecadado por mensagem enviada/recebida:
          </span>
          <span className='font-black text-4xl text-emerald-600'>
            R$ {agg.avg_value_per_message?.toFixed(2) ?? '0.00'}
          </span>
        </div>

        <div className='mt-2 grid grid-cols-2 gap-4'>
          <div className='flex flex-col gap-1 rounded-xl border bg-card p-4 text-center'>
            <span className='font-semibold text-muted-foreground text-xs uppercase opacity-70'>
              Média de Negócio
            </span>
            <span className='font-bold text-xl'>R$ {agg.avg_deal_value?.toFixed(2) ?? '0.00'}</span>
          </div>

          <div className='flex flex-col gap-1 rounded-xl border bg-card p-4 text-center'>
            <span className='font-semibold text-muted-foreground text-xs uppercase opacity-70'>
              Msg P/ Venda
            </span>
            <span className='font-bold text-foreground text-xl'>
              {agg.avg_messages ?? '0'} msgs
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
