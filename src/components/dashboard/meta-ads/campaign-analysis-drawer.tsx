'use client'

import React, { useState } from 'react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Sparkles, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Activity, Lightbulb } from 'lucide-react'
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Bar,
    ComposedChart
} from 'recharts'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TimelineDay {
    date: string
    spend: number
    revenue: number
    cpa: number
    clicks: number
    purchases: number
    roas: number
    lpv: number
    ic: number
}

interface Bottleneck {
    type: string
    severity: 'high' | 'medium' | 'low'
    description: string
    metric?: string
}

interface ActionItem {
    priority: number
    action: string
    rationale: string
    effort: 'low' | 'medium' | 'high'
}

interface AnalysisResult {
    status: 'CRITICAL' | 'WARNING' | 'HEALTHY'
    summary: string
    bottlenecks: Bottleneck[]
    actionPlan: ActionItem[]
}

export interface CopilotAnalysisResult {
    timeline: TimelineDay[]
    analysis: AnalysisResult
}

interface CampaignAnalysisDrawerProps {
    isOpen: boolean
    onClose: () => void
    campaignName: string
    campaignId: string
    accountId: string
    organizationId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CampaignAnalysisDrawer({
    isOpen,
    onClose,
    campaignName,
    campaignId,
    accountId,
    organizationId
}: CampaignAnalysisDrawerProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<CopilotAnalysisResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    React.useEffect(() => {
        if (isOpen && campaignId && !result) {
            handleAnalyze()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, campaignId])

    const handleAnalyze = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const resp = await fetch('/api/v1/meta-ads/copilot-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId,
                    campaignId,
                    accountId,
                    campaignName,
                    days: 14,
                })
            })
            const data = await resp.json()
            if (!resp.ok) throw new Error(data.error || 'Erro ao analisar campanha')
            setResult(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const analysis = result?.analysis
    const timeline = result?.timeline || []
    const { status, summary, bottlenecks, actionPlan } = analysis || {}

    const StatusIcon = status === 'CRITICAL' ? AlertTriangle : status === 'WARNING' ? TrendingDown : TrendingUp
    const statusColor = status === 'CRITICAL' ? 'text-red-500' : status === 'WARNING' ? 'text-amber-500' : 'text-green-500'
    const statusBg = status === 'CRITICAL' ? 'bg-red-50 border-red-100' : status === 'WARNING' ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'
    const statusBadgeColor = status === 'CRITICAL' ? 'bg-red-100 text-red-700' : status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl overflow-y-auto flex flex-col"
                side="right"
            >
                {/* Header */}
                <SheetHeader className="pb-5 border-b shrink-0">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-500">
                            Copiloto de Tráfego
                        </h2>
                    </div>
                    <SheetTitle className="text-base font-semibold leading-snug text-foreground truncate">
                        {campaignName}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground">
                        Análise dos últimos 14 dias · Meta Graph API + GPT-4o
                    </SheetDescription>
                </SheetHeader>

                {/* Body */}
                <div className="flex-1 py-6 space-y-6 overflow-y-auto">

                    {/* ── Loading ── */}
                    {isLoading && (
                        <div className="space-y-5">
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground/60">
                                <Sparkles className="w-10 h-10 animate-pulse text-indigo-400" />
                                <p className="text-sm font-medium animate-pulse">Analisando campanha com GPT-4o...</p>
                                <p className="text-xs text-muted-foreground/40">Aguarde alguns segundos</p>
                            </div>
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-60 w-full rounded-xl" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-40 w-full rounded-xl" />
                                <Skeleton className="h-40 w-full rounded-xl" />
                            </div>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {!isLoading && error && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-start gap-3 border border-destructive/20">
                            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-semibold text-sm mb-0.5">Falha na Análise</h4>
                                <p className="text-sm opacity-90">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Result ── */}
                    {!isLoading && result && analysis && (
                        <>
                            {/* Status + Summary */}
                            <div className={`rounded-xl p-5 border space-y-2 relative overflow-hidden ${statusBg}`}>
                                <div className="absolute top-0 right-0 p-5 opacity-[0.04]">
                                    <Activity className="w-28 h-28" />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                                        <span className="font-bold text-sm">Veredito Geral</span>
                                    </div>
                                    <span className={`text-[11px] uppercase font-bold tracking-wide px-2.5 py-1 rounded-full ${statusBadgeColor}`}>
                                        {status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    {summary}
                                </p>
                            </div>

                            {/* Chart */}
                            {timeline.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-muted-foreground" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Evolução do Funil — Últimos 14 dias
                                        </h3>
                                    </div>
                                    <div className="h-[260px] w-full border rounded-xl p-4 bg-white shadow-sm">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={timeline} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    style={{ fontSize: '11px' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dy={8}
                                                />
                                                <YAxis
                                                    yAxisId="left"
                                                    style={{ fontSize: '11px' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(val) => `R$${val}`}
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    style={{ fontSize: '11px' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: '12px' }}
                                                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                    formatter={(value: any, name: any) => {
                                                        if (!value) return [0, name]
                                                        if (name === 'Gasto' || name === 'Faturamento') return [formatCurrencyBRL(Number(value)), name]
                                                        return [value, name]
                                                    }}
                                                />
                                                <Bar yAxisId="left" dataKey="spend" name="Gasto" fill="#E0E7FF" radius={[4, 4, 0, 0]} />
                                                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Faturamento" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                                                <Line yAxisId="right" type="monotone" dataKey="purchases" name="Vendas" stroke="#6366F1" strokeWidth={2} dot={false} strokeDasharray="5 4" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex items-center gap-5 justify-center text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-100" /> Gasto</div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded bg-emerald-500" /> Faturamento</div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded bg-indigo-500 opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #6366F1 0 5px, transparent 5px 9px)' }} /> Vendas</div>
                                    </div>
                                </div>
                            )}

                            {/* Bottlenecks + Action Plan */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                                {/* Gargalos */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Gargalos Identificados
                                        </h3>
                                    </div>
                                    {(!bottlenecks || bottlenecks.length === 0) ? (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100 text-sm text-green-700">
                                            <CheckCircle className="w-4 h-4" /> Nenhum gargalo crítico detectado
                                        </div>
                                    ) : (
                                        <ul className="space-y-2.5">
                                            {bottlenecks.map((b, i) => (
                                                <li key={i} className="flex flex-col gap-1 p-3.5 bg-orange-50/60 rounded-xl border border-orange-100">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${b.severity === 'high' ? 'bg-red-500' : b.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-400'}`} />
                                                        <span className="text-slate-800 font-bold text-sm">{b.type}</span>
                                                        <span className={`ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${b.severity === 'high' ? 'bg-red-100 text-red-600' : b.severity === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                            {b.severity === 'high' ? 'Alto' : b.severity === 'medium' ? 'Médio' : 'Baixo'}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-700 text-sm leading-snug ml-4">{b.description}</p>
                                                    {b.metric && (
                                                        <span className="ml-4 text-[11px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-orange-100 w-fit">
                                                            {b.metric}
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Plano de ação */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Plano de Otimização
                                        </h3>
                                    </div>
                                    {(!actionPlan || actionPlan.length === 0) ? (
                                        <p className="text-sm text-muted-foreground p-3">Nenhuma ação sugerida no momento.</p>
                                    ) : (
                                        <ul className="space-y-2.5">
                                            {[...actionPlan].sort((a, b) => a.priority - b.priority).map((p, i) => (
                                                <li key={i} className="flex flex-col gap-1 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 relative">
                                                    <div className="absolute top-3 right-3 text-[10px] font-bold uppercase text-indigo-400 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                                                        {p.effort === 'high' ? 'Esforço: Alto' : p.effort === 'medium' ? 'Esforço: Médio' : 'Esforço: Baixo'}
                                                    </div>
                                                    <div className="flex items-start gap-2.5 pr-24">
                                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-[11px] font-bold shrink-0 mt-0.5">
                                                            {p.priority}
                                                        </div>
                                                        <span className="text-slate-800 font-bold text-sm leading-snug">{p.action}</span>
                                                    </div>
                                                    <p className="text-slate-600 text-xs leading-snug ml-7">{p.rationale}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <p className="text-[11px] text-muted-foreground/60 text-center pt-2 border-t">
                                Análise gerada por GPT-4o com dados do Meta Graph API. Pode conter imprecisões — valide antes de tomar decisões.
                            </p>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
