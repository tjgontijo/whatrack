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
    LineChart,
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

export interface CopilotAnalysisResult {
    timeline: {
        date: string;
        spend: number;
        revenue: number;
        cpa: number;
        clicks: number;
        purchases: number;
    }[];
    analysis: {
        status: "CRITICAL" | "WARNING" | "HEALTHY";
        summary: string;
        bottlenecks: {
            type: string;
            severity: "high" | "medium" | "low";
            description: string;
            metric?: string;
        }[];
        actionPlan: {
            priority: number;
            action: string;
            rationale: string;
            effort: "low" | "medium" | "high";
        }[];
    };
}

interface CampaignAnalysisDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    campaignName: string;
    campaignId: string;
    accountId: string;
    organizationId: string;
}

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

    // Analyze on open
    React.useEffect(() => {
        if (isOpen && campaignId && !result) {
            handleAnalyze()
        }
        if (!isOpen) {
            // reset when closed completely? Keep cache maybe for the session.
            // setResult(null)
            // setError(null)
        }
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
                    days: 14 // Analyzes the last 14 days
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

    const { status, summary, bottlenecks, actionPlan } = result?.analysis || {}
    const timeline = result?.timeline || []

    const StatusIcon = status === 'CRITICAL' ? AlertTriangle : status === 'WARNING' ? TrendingDown : TrendingUp
    const statusColor = status === 'CRITICAL' ? 'text-red-500' : status === 'WARNING' ? 'text-amber-500' : 'text-green-500'

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto" side="right">
                <SheetHeader className="pb-4 border-b">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-primary">
                            Copiloto de Tráfego
                        </h2>
                    </div>
                    <SheetTitle className="text-lg leading-snug">
                        {campaignName}
                    </SheetTitle>
                    <SheetDescription>
                        Analisando os últimos 14 dias da sua campanha com IA focada em performance e funil do Meta Ads.
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-8">
                    {isLoading ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-center py-10 flex-col gap-4 text-muted-foreground/50">
                                <Sparkles className="w-8 h-8 animate-pulse text-indigo-400" />
                                <span className="animate-pulse font-medium text-sm">IA processando histórico do Meta Graph API...</span>
                            </div>
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="h-64 w-full rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-5 w-1/2" />
                            </div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-sm">Falha na Análise</h4>
                                <p className="text-sm opacity-90">{error}</p>
                            </div>
                        </div>
                    ) : result ? (
                        <>
                            {/* Summary & Veredict */}
                            <div className="bg-slate-50 border rounded-xl p-5 space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Activity className="w-32 h-32" />
                                </div>
                                <div className="flex items-center gap-2 font-semibold">
                                    <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                                    <span>Veredito (Status: {status})</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed relative z-10">
                                    {summary}
                                </p>
                            </div>

                            {/* Chart Data */}
                            {timeline.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-muted-foreground" />
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Evolução do Funil (14d)</h3>
                                    </div>
                                    <div className="h-[280px] w-full border rounded-xl p-4 bg-white shadow-sm">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={timeline} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    style={{ fontSize: '11px' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dy={10}
                                                />
                                                <YAxis yAxisId="left" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                                                <YAxis yAxisId="right" orientation="right" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                                    formatter={(value: any, name: any) => {
                                                        if (!value) return [0, name]
                                                        if (name === 'Gasto (R$)' || name === 'Faturamento (R$)') return [formatCurrencyBRL(Number(value)), name]
                                                        return [value, name]
                                                    }}
                                                />
                                                <Bar yAxisId="left" dataKey="spend" name="Gasto (R$)" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                                                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Faturamento (R$)" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                                                <Line yAxisId="right" type="monotone" dataKey="purchases" name="Vendas" stroke="#6366F1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Bottlenecks vs Action Plan Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Gargalos */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gargalos Encontrados</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {bottlenecks?.map((b: any, i: number) => (
                                            <li key={i} className="flex flex-col gap-1 p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                                                <div className="flex items-start gap-2">
                                                    <div className={`min-w-2 h-2 rounded-full mt-1.5 ${b.severity === 'high' ? 'bg-red-500' : b.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                                                    <span className="text-slate-800 font-semibold text-sm">{b.type}</span>
                                                </div>
                                                <span className="text-slate-700 text-sm leading-snug ml-4">{b.description}</span>
                                                {b.metric && (
                                                    <span className="text-xs text-slate-500 font-medium ml-4 mt-1 bg-white inline-flex w-fit px-2 py-0.5 rounded border border-orange-100">{b.metric}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Action Plan */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plano de Otimização</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {actionPlan?.sort((a, b) => a.priority - b.priority).map((p, i: number) => (
                                            <li key={i} className="flex flex-col gap-1 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 relative">
                                                <div className="absolute top-3 right-3 text-[10px] uppercase font-bold text-indigo-400 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                                                    Esforço: {p.effort === 'high' ? 'Alto' : p.effort === 'medium' ? 'Médio' : 'Baixo'}
                                                </div>
                                                <div className="flex items-start gap-2 pr-16">
                                                    <div className="flex items-center justify-center min-w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-bold mt-0.5">
                                                        {p.priority}
                                                    </div>
                                                    <span className="text-slate-800 leading-snug font-semibold text-sm">{p.action}</span>
                                                </div>
                                                <span className="text-slate-600 text-sm ml-7">{p.rationale}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}
