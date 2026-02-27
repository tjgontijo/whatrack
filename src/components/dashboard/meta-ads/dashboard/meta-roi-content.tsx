'use client'

import { BarChart3, TrendingUp, DollarSign, Target, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MetaROIContentProps {
  roiData: { accountSummary: any[]; campaigns: any[] } | undefined
  isLoading: boolean
  isRefetching: boolean
  onRefresh: () => void
}

export function MetaROIContent({
  roiData,
  isLoading,
  isRefetching,
  onRefresh,
}: MetaROIContentProps) {
  const totalSpend =
    roiData?.accountSummary?.reduce((acc: number, curr: any) => acc + curr.spend, 0) || 0
  const totalRevenue =
    roiData?.accountSummary?.reduce((acc: number, curr: any) => acc + curr.revenue, 0) || 0
  const globalROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00'

  const chartData = roiData?.accountSummary?.map((acc: any) => ({
    name: acc.accountName.substring(0, 15) + '...',
    Investimento: acc.spend,
    Retorno: acc.revenue,
  }))

  return (
    <div className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 font-medium text-blue-600">
                <DollarSign className="h-4 w-4" /> Investimento Total
              </CardDescription>
              <CardTitle className="text-3xl font-bold">
                {isLoading ? (
                  <span className="text-muted-foreground/30">—</span>
                ) : (
                  `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 font-medium text-emerald-600">
                <TrendingUp className="h-4 w-4" /> Receita Atribuída
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-700">
                {isLoading ? (
                  <span className="text-muted-foreground/30">—</span>
                ) : (
                  `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card
            className={`border-primary/20 bg-gradient-to-br ${Number(globalROAS) >= 2 ? 'from-primary/5' : 'from-amber-50'} to-white`}
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-primary flex items-center gap-1.5 font-medium">
                <Target className="h-4 w-4" /> ROAS Global
              </CardDescription>
              <CardTitle className="text-3xl font-bold">
                {isLoading ? <span className="text-muted-foreground/30">—</span> : `${globalROAS}x`}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Charts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="text-muted-foreground h-5 w-5" />
              Desempenho por Conta
            </CardTitle>
            <CardDescription>
              Comparativo entre Investimento (Meta) vs Receita (WhaTrack)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm font-medium">
                  Calculando retorno de investimento...
                </p>
              </div>
            ) : (chartData?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748B' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748B' }}
                  />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                  />
                  <Bar dataKey="Investimento" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="Retorno" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground bg-muted/5 flex h-full flex-col items-center justify-center rounded-lg italic">
                Nenhum dado disponível. Configure suas contas em Configurações.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Detalhamento Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-medium uppercase">
                  <tr>
                    <th className="px-6 py-3">Campanha</th>
                    <th className="px-6 py-3">Conta Relacionada</th>
                    <th className="px-6 py-3 text-right">Investimento (Spend)</th>
                    <th className="px-6 py-3 text-right">Faturamento (Sale)</th>
                    <th className="px-6 py-3 text-center">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <RefreshCw className="text-muted-foreground/20 mx-auto h-6 w-6 animate-spin" />
                      </td>
                    </tr>
                  ) : (roiData?.campaigns?.length ?? 0) > 0 ? (
                    roiData?.campaigns?.map((camp: any) => (
                      <tr key={camp.campaignId} className="hover:bg-muted/10 transition-colors">
                        <td
                          className="max-w-[200px] truncate px-6 py-4 font-medium"
                          title={camp.campaignName}
                        >
                          {camp.campaignName}
                        </td>
                        <td className="text-muted-foreground px-6 py-4 text-xs">
                          {camp.accountName}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-blue-600">
                          R$ {camp.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-600">
                          R$ {camp.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge
                            variant={Number(camp.roas) >= 2 ? 'default' : 'outline'}
                            className={
                              Number(camp.roas) >= 2 ? 'bg-emerald-500 hover:bg-emerald-600' : ''
                            }
                          >
                            {camp.roas}x
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-muted-foreground px-6 py-12 text-center">
                        Nenhuma campanha encontrada com gastos no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {!roiData?.accountSummary?.length && !isLoading && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
            <p className="text-xs text-blue-800">
              <b>Dica:</b> Para ver o ROI aqui, você precisa conectar seu Perfil Meta em
              Configurações e ativar o "Dataset ID" de cada conta de anúncios que deseja rastrear.
            </p>
          </div>
        )}
    </div>
  )
}
