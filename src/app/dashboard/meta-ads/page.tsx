'use client'

import { useQuery } from '@tanstack/react-query'
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Target,
    RefreshCw,
    AlertCircle
} from 'lucide-react'
import axios from 'axios'
import {
    TemplateMainShell,
    TemplateMainHeader
} from '@/components/dashboard/leads'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth/auth-client'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

export default function MetaROIOverviewPage() {
    const { data: organization } = authClient.useActiveOrganization()
    const organizationId = organization?.id

    const { data: roiData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['meta-ads', 'insights', organizationId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/meta-ads/insights?organizationId=${organizationId}`)
            return res.data
        },
        enabled: !!organizationId
    })

    const totalSpend = roiData?.reduce((acc: number, curr: any) => acc + curr.spend, 0) || 0
    const totalRevenue = roiData?.reduce((acc: number, curr: any) => acc + curr.revenue, 0) || 0
    const globalROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00'

    const chartData = roiData?.map((acc: any) => ({
        name: acc.accountName.substring(0, 15) + '...',
        Investimento: acc.spend,
        Retorno: acc.revenue
    }))

    return (
        <TemplateMainShell className="flex flex-col h-screen overflow-hidden">
            <TemplateMainHeader
                title="Dashboard ROI Meta Ads"
                subtitle="Analise o retorno sobre o investimento de suas campanhas Click-to-WhatsApp"
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                        Atualizar Dados
                    </Button>
                }
            />

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-muted/5">

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-1.5 text-blue-600 font-medium">
                                <DollarSign className="h-4 w-4" /> Investimento Total
                            </CardDescription>
                            <CardTitle className="text-3xl font-bold">
                                {isLoading ? <Skeleton className="h-8 w-32" /> : `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                <TrendingUp className="h-4 w-4" /> Receita Atribuída
                            </CardDescription>
                            <CardTitle className="text-3xl font-bold text-emerald-700">
                                {isLoading ? <Skeleton className="h-8 w-32" /> : `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className={`bg-gradient-to-br border-primary/20 ${Number(globalROAS) >= 2 ? 'from-primary/5' : 'from-amber-50'} to-white`}>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-1.5 text-primary font-medium">
                                <Target className="h-4 w-4" /> ROAS Global
                            </CardDescription>
                            <CardTitle className="text-3xl font-bold">
                                {isLoading ? <Skeleton className="h-8 w-16" /> : `${globalROAS}x`}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                                Desempenho por Conta
                            </CardTitle>
                            <CardDescription>Comparativo entre Investimento (Meta) vs Receita (WhaTrack)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            {isLoading ? (
                                <Skeleton className="h-full w-full" />
                            ) : chartData?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                        <Tooltip
                                            cursor={{ fill: '#F8FAFC' }}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                                        />
                                        <Bar dataKey="Investimento" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                                        <Bar dataKey="Retorno" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic bg-muted/5 rounded-lg">
                                    Nenhum dado disponível. Configure suas contas em Configurações.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Breakdown Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Detalhamento Financeiro</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Conta de Anúncios</th>
                                        <th className="px-6 py-3 text-right">Investimento (Spend)</th>
                                        <th className="px-6 py-3 text-right">Faturamento (Sale)</th>
                                        <th className="px-6 py-3 text-center">ROAS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {isLoading ? (
                                        [1, 2].map(i => <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-6 w-full" /></td></tr>)
                                    ) : roiData?.length > 0 ? (
                                        roiData.map((acc: any) => (
                                            <tr key={acc.accountId} className="hover:bg-muted/10 transition-colors">
                                                <td className="px-6 py-4 font-medium">{acc.accountName}</td>
                                                <td className="px-6 py-4 text-right font-mono text-blue-600">R$ {acc.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right font-mono text-emerald-600">R$ {acc.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={Number(acc.roas) >= 2 ? 'default' : 'outline'} className={Number(acc.roas) >= 2 ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                                        {acc.roas}x
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">Vincule contas de anúncios para ver o ROI.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {!roiData?.length && !isLoading && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 items-center">
                        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
                        <p className="text-xs text-blue-800">
                            <b>Dica:</b> Para ver o ROI aqui, você precisa conectar seu Perfil Meta em Configurações e ativar o "Dataset ID" de cada conta de anúncios que deseja rastrear.
                        </p>
                    </div>
                )}
            </div>
        </TemplateMainShell>
    )
}
