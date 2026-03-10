'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Clock, TrendingUp, Zap } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DashboardMetricCard, DashboardMetricGrid } from '@/components/dashboard/charts/card'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'

interface AiUsageStats {
  totals: {
    calls: number
    totalTokens: number
    estimatedUSD: number
  }
  byFeature: Array<{
    feature: string
    calls: number
    estimatedUSD: number
  }>
  daily: Array<{
    date: string
    estimatedUSD: number
    calls: number
  }>
}

interface AiUsageLog {
  id: string
  feature: string
  agentName: string
  totalTokens: number
  totalCost: number
  status: string
  createdAt: string
}

interface LogsResponse {
  logs: AiUsageLog[]
  pagination: {
    page: number
    pages: number
  }
}

const periodOptions = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
]

export function AiUsageContent() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const [period, setPeriod] = React.useState('30d')
  const [logsPage, setLogsPage] = React.useState(1)

  const { data: statsData, isLoading: statsLoading } = useQuery<AiUsageStats>({
    queryKey: ['ai-usage-stats', period, organizationId],
    queryFn: async () => apiFetch(`/api/v1/ai/usage?period=${period}`),
    enabled: !!organizationId,
  })

  const { data: logsData, isLoading: logsLoading } = useQuery<LogsResponse>({
    queryKey: ['ai-usage-logs', logsPage, organizationId],
    queryFn: async () => apiFetch(`/api/v1/ai/usage/logs?page=${logsPage}&limit=10`),
    enabled: !!organizationId,
  })

  const stats = statsData?.totals
  const dailyChartData = (statsData?.daily || [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((day) => ({
      date: new Date(day.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      cost: Number(day.estimatedUSD.toFixed(2)),
      calls: day.calls,
    }))

  const featureChartData = (statsData?.byFeature || []).map((feature) => ({
    feature: feature.feature,
    calls: feature.calls,
    cost: Number(feature.estimatedUSD.toFixed(2)),
  }))

  const logs = logsData?.logs || []
  const pagination = logsData?.pagination

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            variant={period === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setPeriod(option.value)
              setLogsPage(1)
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <DashboardMetricGrid>
        <DashboardMetricCard
          icon={<Activity className="h-4 w-4" />}
          title="Chamadas"
          value={stats?.calls?.toLocaleString() || '0'}
          isLoading={statsLoading}
        />
        <DashboardMetricCard
          icon={<Zap className="h-4 w-4" />}
          title="Tokens totais"
          value={(stats?.totalTokens || 0).toLocaleString()}
          isLoading={statsLoading}
        />
        <DashboardMetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Custo estimado"
          value={`$${(stats?.estimatedUSD || 0).toFixed(4)}`}
          isLoading={statsLoading}
        />
        <DashboardMetricCard
          icon={<Clock className="h-4 w-4" />}
          title="Média por chamada"
          value={
            stats && stats.calls > 0
              ? `${(stats.totalTokens / stats.calls).toFixed(0)} tokens`
              : '0'
          }
          isLoading={statsLoading}
        />
      </DashboardMetricGrid>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-6">
          <h3 className="font-semibold">Custo diário</h3>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => `$${(value as number).toFixed(4)}`} />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border p-6">
          <h3 className="font-semibold">Distribuição por funcionalidade</h3>
          {featureChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={featureChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="feature" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => (value as number).toLocaleString()} />
                <Legend />
                <Bar dataKey="calls" fill="hsl(var(--primary))" name="Chamadas" />
                <Bar dataKey="cost" fill="hsl(var(--chart-2))" name="Custo ($)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-6">
        <h3 className="font-semibold">Histórico detalhado</h3>

        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Agente</th>
                  <th className="px-4 py-2 text-left font-medium">Funcionalidade</th>
                  <th className="px-4 py-2 text-right font-medium">Tokens</th>
                  <th className="px-4 py-2 text-right font-medium">Custo</th>
                  <th className="px-4 py-2 text-center font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-2">{log.agentName}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{log.feature}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {log.totalTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">${log.totalCost.toFixed(4)}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {logsLoading ? 'Carregando logs...' : 'Nenhum log encontrado'}
          </div>
        )}

        {pagination && pagination.pages > 1 ? (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Página {pagination.page} de {pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogsPage((page) => Math.max(1, page - 1))}
                disabled={logsPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogsPage((page) => Math.min(pagination.pages, page + 1))}
                disabled={logsPage === pagination.pages}
              >
                Próxima
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
