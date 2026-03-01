'use client'

import { useQuery } from '@tanstack/react-query'
const formatDealValue = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return '0,00'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue)
}

import { apiFetch } from '@/lib/api-client'
import { authClient } from '@/lib/auth/auth-client'

export default function EfficiencyChart({
  startDate,
  endDate,
}: {
  startDate: string
  endDate: string
}) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id

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


  if (isLoading) return <div className="bg-card h-full w-full animate-pulse rounded-xl border" />
  if (error || !data)
    return (
      <div className="bg-card text-muted-foreground flex h-full w-full items-center justify-center rounded-xl border p-4 text-sm">
        Grafico de Eficiência não disponível
      </div>
    )

  const agg = data.aggregated?.[0] || {}

  return (
    <div className="bg-card flex h-full w-full flex-col overflow-hidden rounded-xl border p-4 shadow-sm">
      <h3 className="text-foreground mb-4 text-base font-semibold">Esforço por Mensagem</h3>
      <div className="bg-background/50 flex flex-1 flex-col justify-center gap-4 rounded-md p-6">
        <div className="bg-card flex flex-col gap-1 rounded-xl border p-4 text-center">
          <span className="text-muted-foreground text-sm font-medium">
            Valor arrecadado por mensagem enviada/recebida:
          </span>
          <span className="text-4xl font-black text-emerald-600">
            R$ {agg.avg_value_per_message?.toFixed(2) ?? '0.00'}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="bg-card flex flex-col gap-1 rounded-xl border p-4 text-center">
            <span className="text-muted-foreground text-xs font-semibold uppercase opacity-70">
              Média de Negócio
            </span>
            <span className="text-xl font-bold">R$ {agg.avg_deal_value?.toFixed(2) ?? '0.00'}</span>
          </div>

          <div className="bg-card flex flex-col gap-1 rounded-xl border p-4 text-center">
            <span className="text-muted-foreground text-xs font-semibold uppercase opacity-70">
              Msg P/ Venda
            </span>
            <span className="text-foreground text-xl font-bold">
              {agg.avg_messages ?? '0'} msgs
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
