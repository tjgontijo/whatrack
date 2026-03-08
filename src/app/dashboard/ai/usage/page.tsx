'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Activity, Zap, Clock } from 'lucide-react'
import { LineChart, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar } from 'recharts'

import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { DashboardMetricCard, DashboardMetricGrid } from '@/components/dashboard/charts/card'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'

interface AiUsageStats {
  period: string
  daysBack: number
  totals: {
    calls: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedUSD: number
  }
  byFeature: Array<{
    feature: string
    calls: number
    totalTokens: number
    estimatedUSD: number
  }>
  daily: Array<{
    date: string
    estimatedUSD: number
    calls: number
    totalTokens: number
  }>
}

interface AiUsageLog {
  id: string
  feature: string
  operation: string
  agentName: string
  eventType: string
  modelUsed: string
  totalTokens: number
  totalCost: number
  latencyMs: number | null
  status: string
  errorMessage: string | null
  createdAt: string
}

interface LogsResponse {
  logs: AiUsageLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

const periodOptions = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
]

export default function AiUsagePage() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const [period, setPeriod] = React.useState('30d')
  const [logsPage, setLogsPage] = React.useState(1)

  const { data: statsData, isLoading: statsLoading } = useQuery<AiUsageStats>({
    queryKey: ['ai-usage-stats', period, organizationId],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/ai/usage?period=${period}`)
      return response.json()
    },
    enabled: !!organizationId,
  })

  const { data: logsData, isLoading: logsLoading } = useQuery<LogsResponse>({
    queryKey: ['ai-usage-logs', logsPage, organizationId],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/ai/usage/logs?page=${logsPage}&limit=10`)
      return response.json()
    },
    enabled: !!organizationId,
  })

  const stats = statsData?.totals
  const daily = statsData?.daily || []
  const byFeature = statsData?.byFeature || []
  const logs = logsData?.logs || []
  const pagination = logsData?.pagination

  // Format data for charts
  const dailyChartData = daily
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      cost: parseFloat(d.estimatedUSD.toFixed(2)),
      calls: d.calls,
    }))

  const featureChartData = byFeature.map((f) => ({
    feature: f.feature,
    calls: f.calls,
    cost: parseFloat(f.estimatedUSD.toFixed(2)),
  }))

  return (
    <PageShell>
      <PageHeader
        title="Uso da IA"
        description="Acompanhe custos e uso de agentes"
        actions={
          <div className="flex gap-2">
            {periodOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={period === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPeriod(opt.value)
                  setLogsPage(1)
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
      />

      <PageContent>
        {/* Metrics Grid */}
        <DashboardMetricGrid>
          <DashboardMetricCard
            icon={<Activity className="h-4 w-4" />}
            title="Chamadas"
            value={stats?.calls?.toLocaleString() || '0'}
            isLoading={statsLoading}
          />
          <DashboardMetricCard
            icon={<Zap className="h-4 w-4" />}
            title="Tokens Totais"
            value={(stats?.totalTokens || 0).toLocaleString()}
            isLoading={statsLoading}
          />
          <DashboardMetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            title="Custo Estimado"
            value={`$${(stats?.estimatedUSD || 0).toFixed(4)}`}
            isLoading={statsLoading}
          />
          <DashboardMetricCard
            icon={<Clock className="h-4 w-4" />}
            title="Média por Chamada"
            value={stats && stats.calls > 0 ? `${(stats.totalTokens / stats.calls).toFixed(0)} tokens` : '0'}
            isLoading={statsLoading}
          />
        </DashboardMetricGrid>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Daily Cost Trend */}
          <div className="space-y-3 rounded-lg border p-6">
            <h3 className="font-semibold">Custo Diário</h3>
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

          {/* Feature Breakdown */}
          <div className="space-y-3 rounded-lg border p-6">
            <h3 className="font-semibold">Distribuição por Funcionalidade</h3>
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

        {/* Logs Table */}
        <div className="space-y-3 rounded-lg border p-6">
          <h3 className="font-semibold">Histórico Detalhado</h3>
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
                      <td className="px-4 py-2 text-right font-mono">{log.totalTokens.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-mono">${log.totalCost.toFixed(4)}</td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            log.status === 'success'
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : log.status === 'error'
                                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              Nenhum registro encontrado
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                Página {pagination.page} de {pagination.pages} ({pagination.total} registros)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logsPage === 1}
                  onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logsPage >= pagination.pages}
                  onClick={() => setLogsPage(Math.min(pagination.pages, logsPage + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </PageShell>
  )
}
