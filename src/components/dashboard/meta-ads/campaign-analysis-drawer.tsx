'use client'

import React, { useState } from 'react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Sparkles, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Activity, Lightbulb, BarChart3, LineChart } from 'lucide-react'
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Bar,
    ComposedChart,
    LabelList
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

interface DiagnosticItem {
    area: string
    severity: 'high' | 'medium' | 'low'
    observation: string
    rootCause: string
}

interface Recommendation {
    priority: number
    action: string
}

interface AnalysisResult {
    status: 'CRITICAL' | 'WARNING' | 'HEALTHY'
    executiveSummary: string
    deepDiagnostics: DiagnosticItem[]
    keyRecommendations: Recommendation[]
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
    const [error, setError] = useState<{ message: string, detail?: string } | null>(null)

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
            if (!resp.ok) {
                setError({
                    message: data.error || 'Erro ao analisar campanha',
                    detail: data.detail
                })
                return
            }
            setResult(data)
        } catch (err: any) {
            setError({ message: err.message })
        } finally {
            setIsLoading(false)
        }
    }

    const analysis = result?.analysis
    const timeline = result?.timeline || []
    const { status, executiveSummary, deepDiagnostics, keyRecommendations } = analysis || {}

    const StatusIcon = status === 'CRITICAL' ? AlertTriangle : status === 'WARNING' ? TrendingDown : TrendingUp
    const statusColor = status === 'CRITICAL' ? 'text-red-500' : status === 'WARNING' ? 'text-amber-500' : 'text-green-500'
    const statusBg = status === 'CRITICAL' ? 'bg-red-50 border-red-100' : status === 'WARNING' ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'
    const statusBadgeColor = status === 'CRITICAL' ? 'bg-red-100 text-red-700' : status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                className="overflow-y-auto flex flex-col p-0"
                style={{ width: '45vw', maxWidth: '45vw', minWidth: '400px' }}
                side="right"
            >
                {/* Header Section */}
                <div className="bg-slate-50 border-b px-6 py-5 shrink-0 z-10 sticky top-0">
                    <SheetHeader>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center shadow-sm">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h2 className="text-base font-bold text-slate-800 tracking-tight">
                                Agente Analítico de BI
                            </h2>
                        </div>
                        <SheetTitle className="text-xl font-bold text-foreground leading-tight truncate">
                            {campaignName}
                        </SheetTitle>
                        <SheetDescription className="text-sm font-medium text-slate-500 mt-1">
                            Insights diagnosticados sobre os últimos 14 dias de performance macro.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                    {/* ── Loading ── */}
                    {isLoading && (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground/60 w-full rounded-2xl bg-slate-50 border border-slate-100">
                                <Activity className="w-12 h-12 animate-pulse text-indigo-400" />
                                <div className="text-center">
                                    <p className="font-semibold text-slate-600 animate-pulse">Agregando métricas e elaborando diagnóstico...</p>
                                    <p className="text-xs text-slate-400 mt-1">Este processo analisa o funil completo usando OpenAI GPT-4o.</p>
                                </div>
                            </div>
                            <Skeleton className="h-28 w-full rounded-xl" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-48 w-full rounded-xl" />
                                <Skeleton className="h-48 w-full rounded-xl" />
                            </div>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {!isLoading && error && (
                        <div className="p-5 bg-destructive/5 border border-destructive/20 text-destructive rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm">A análise não pôde ser completada</h4>
                                <p className="text-sm opacity-90 leading-relaxed">{error.message}</p>
                                {error.detail && (
                                    <div className="pt-2 mt-2 boreder-t border-destructive/10">
                                        <p className="text-xs opacity-75">{error.detail}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Result ── */}
                    {!isLoading && result && analysis && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both space-y-8">

                            {/* Executive Summary */}
                            <div className={`rounded-xl p-6 border relative overflow-hidden ${statusBg}`}>
                                <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-3">
                                    <div className="flex items-center gap-2">
                                        <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                                        <h3 className="font-bold text-slate-800 text-sm tracking-tight">Síntese Executiva</h3>
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-sm ${statusBadgeColor}`}>
                                        Veredito: {status}
                                    </span>
                                </div>
                                <p className="text-[15px] font-medium text-slate-700 leading-relaxed">
                                    {executiveSummary}
                                </p>
                            </div>

                            {/* Charts - Two clear macro views */}
                            {timeline.length > 0 && (
                                <div className="space-y-5">

                                    {/* Chart 1: Financeiro */}
                                    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 border-b px-4 py-3 flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-slate-500" />
                                            <h4 className="font-semibold text-sm text-slate-700">Fluxo Financeiro (Gasto x Faturamento)</h4>
                                        </div>
                                        <div className="h-[220px] w-full p-4 pb-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                        style={{ fontSize: '10px', fill: '#64748b' }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        dy={8}
                                                    />
                                                    <YAxis
                                                        style={{ fontSize: '10px', fill: '#64748b' }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickFormatter={(val) => `R$${val}`}
                                                    />
                                                    <RechartsTooltip
                                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                                        formatter={(value: any, name: any) => {
                                                            if (!value) return [0, name]
                                                            return [formatCurrencyBRL(Number(value)), name]
                                                        }}
                                                    />
                                                    <Bar dataKey="spend" name="Gasto Ocorrido" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={30}>
                                                        <LabelList dataKey="spend" position="top" formatter={(val: any) => Number(val) > 0 ? `R$${val}` : ''} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                                    </Bar>
                                                    <Line type="monotone" dataKey="revenue" name="Retorno (ROAS)" stroke="#10b981" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 4 }}>
                                                        <LabelList dataKey="revenue" position="top" formatter={(val: any) => Number(val) > 0 ? `R$${val}` : ''} style={{ fontSize: '10px', fill: '#059669', fontWeight: 'bold' }} />
                                                    </Line>
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Chart 2: Eficiência (CPA x Conversões) */}
                                    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 border-b px-4 py-3 flex items-center gap-2">
                                            <LineChart className="w-4 h-4 text-slate-500" />
                                            <h4 className="font-semibold text-sm text-slate-700">Curva de Esforço (CPA vs Volume)</h4>
                                        </div>
                                        <div className="h-[220px] w-full p-4 pb-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={timeline} margin={{ top: 10, right: -10, left: -10, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                        style={{ fontSize: '10px', fill: '#64748b' }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        dy={8}
                                                    />
                                                    <YAxis
                                                        yAxisId="left"
                                                        style={{ fontSize: '10px', fill: '#64748b' }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickFormatter={(val) => `R$${val}`}
                                                    />
                                                    <YAxis
                                                        yAxisId="right"
                                                        orientation="right"
                                                        style={{ fontSize: '10px', fill: '#64748b' }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <RechartsTooltip
                                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                                        formatter={(value: any, name: any) => {
                                                            if (!value) return [0, name]
                                                            if (name === 'Custo por Aquisição (CPA)') return [formatCurrencyBRL(Number(value)), name]
                                                            return [value, name]
                                                        }}
                                                    />
                                                    <Line yAxisId="left" type="monotone" dataKey="cpa" name="Custo por Aquisição (CPA)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4">
                                                        <LabelList dataKey="cpa" position="top" formatter={(val: any) => Number(val) > 0 ? `R$${val}` : ''} style={{ fontSize: '10px', fill: '#ef4444' }} />
                                                    </Line>
                                                    <Bar yAxisId="right" dataKey="purchases" name="Volume de Compras" fill="#6366f1" radius={[2, 2, 0, 0]} maxBarSize={30} opacity={0.8}>
                                                        <LabelList dataKey="purchases" position="top" formatter={(val: any) => Number(val) > 0 ? val : ''} style={{ fontSize: '10px', fill: '#4f46e5', fontWeight: 'bold' }} />
                                                    </Bar>
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Diagnostics & Recommendations */}
                            <div className="space-y-6">

                                {/* Deep Diagnostics */}
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight text-slate-800 border-b pb-2 mb-4">
                                        Diagnóstico de Causa-Raiz Sistêmica
                                    </h3>
                                    {(!deepDiagnostics || deepDiagnostics.length === 0) ? (
                                        <div className="p-4 bg-slate-50 text-slate-500 text-sm rounded-lg border">
                                            A estrutura opera de maneira excepcionalmente previsível e limpa. Nenhum ofensor relevante detectado.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {deepDiagnostics.map((d, i) => (
                                                <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-2 h-2 rounded-full ${d.severity === 'high' ? 'bg-red-500' : d.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-400'}`} />
                                                        <span className="font-bold text-slate-800 text-[13px]">{d.area}</span>
                                                    </div>
                                                    <div className="space-y-2 mt-3 ml-4">
                                                        <div>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Fato Observado</span>
                                                            <p className="text-[13px] text-slate-600 leading-snug">{d.observation}</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">Diagnóstico Causa-Raiz</span>
                                                            <p className="text-[13px] font-medium text-slate-700 leading-snug">{d.rootCause}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Action Plan */}
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight text-slate-800 border-b pb-2 mb-4">
                                        Roadmap de Correção (Macro)
                                    </h3>
                                    {(!keyRecommendations || keyRecommendations.length === 0) ? (
                                        <div className="p-4 bg-slate-50 text-slate-500 text-sm rounded-lg border">
                                            Nenhuma ação necessária no escopo de campanha no momento.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {[...keyRecommendations].sort((a, b) => a.priority - b.priority).map((r, i) => (
                                                <div key={i} className="flex gap-3 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg items-center">
                                                    <div className="w-6 h-6 shrink-0 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs shadow-sm shadow-indigo-200">
                                                        {r.priority}
                                                    </div>
                                                    <span className="text-[14px] font-medium text-slate-800 leading-snug">{r.action}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className="text-xs text-center text-slate-400 mt-8 mb-4">
                                Análise processada sistemicamente por OpenAI GPT-4o.
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
