'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Users,
  MessageSquare,
  Ticket,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'

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
import {
  StatCard,
  VolumeChart,
  StatusChart,
} from '@/components/dashboard/analytics'
import {
  useDashboardAnalytics,
  type Period,
} from '@/hooks/use-dashboard-analytics'

export default function AnalyticsPage() {
  const [period, setPeriod] = React.useState<Period>('7d')
  const { data, isLoading, error } = useDashboardAnalytics(period)

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="text-muted-foreground">
              Metricas de conversas e atendimentos
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/analytics/agents">
              Ver Agentes
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            Erro ao carregar analytics. Tente novamente.
          </div>
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-[380px]" />
              <Skeleton className="h-[380px]" />
            </div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total de Leads"
                value={data?.cards.totalLeads ?? 0}
                icon={Users}
                description="Novos leads no periodo"
              />
              <StatCard
                title="Conversas Ativas"
                value={data?.cards.activeConversations ?? 0}
                icon={MessageSquare}
                description="Conversas iniciadas"
              />
              <StatCard
                title="Tickets Abertos"
                value={data?.cards.openTickets ?? 0}
                icon={Ticket}
                description="Aguardando atendimento"
              />
              <StatCard
                title="Taxa de Conversao"
                value={`${data?.cards.conversionRate ?? 0}%`}
                icon={TrendingUp}
                description="Tickets ganhos / total"
              />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <VolumeChart
                data={data?.charts.volumeByDay ?? []}
                title="Volume por Dia"
                description="Leads, tickets e vendas ao longo do tempo"
              />
              <StatusChart
                data={
                  data?.charts.byStatus ?? {
                    open: 0,
                    closed: 0,
                    won: 0,
                    lost: 0,
                  }
                }
                title="Status dos Tickets"
                description="Distribuicao por status"
              />
            </div>

            {/* Additional Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Mensagens Recebidas"
                value={data?.cards.messagesReceived ?? 0}
                description="Total no periodo"
              />
              <StatCard
                title="Mensagens Enviadas"
                value={data?.cards.messagesSent ?? 0}
                description="Total no periodo"
              />
              <StatCard
                title="Tempo Medio de Resposta"
                value={
                  data?.avgResponseTime
                    ? formatResponseTime(data.avgResponseTime)
                    : '-'
                }
                description="Media de resposta"
              />
              <StatCard
                title="Lead Score Medio"
                value={
                  data?.avgLeadScore
                    ? `${Math.round(data.avgLeadScore)}/100`
                    : '-'
                }
                description="Engajamento medio"
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}

function formatResponseTime(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}
