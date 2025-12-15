'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { HeaderActions } from '@/components/dashboard/header-actions'
import { AgentsTable } from '@/components/dashboard/analytics'
import { useAgentsAnalytics, type Period } from '@/hooks/use-dashboard-analytics'

export default function AgentsAnalyticsPage() {
  const [period, setPeriod] = React.useState<Period>('7d')
  const { data, isLoading, error } = useAgentsAnalytics(period)

  return (
    <>
      <HeaderActions>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </HeaderActions>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/analytics">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Desempenho dos Agentes</h1>
            <p className="text-muted-foreground">
              Metricas de performance por agente
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            Erro ao carregar metricas dos agentes. Tente novamente.
          </div>
        ) : isLoading ? (
          <Skeleton className="h-[400px]" />
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data?.totalAgents ?? 0} agente{data?.totalAgents !== 1 && 's'}{' '}
                com atividade
              </span>
              <span>Periodo: {getPeriodLabel(period)}</span>
            </div>

            <AgentsTable
              agents={data?.agents ?? []}
              title="Performance dos Agentes"
              description={`Metricas dos ultimos ${getPeriodLabel(period).toLowerCase()}`}
            />
          </>
        )}
      </div>
    </>
  )
}

function getPeriodLabel(period: Period): string {
  switch (period) {
    case '7d':
      return '7 dias'
    case '30d':
      return '30 dias'
    case '90d':
      return '90 dias'
    default:
      return period
  }
}
