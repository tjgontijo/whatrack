'use client'

import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  Lightbulb,
  BarChart3,
  LineChart,
} from 'lucide-react'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
  LabelList,
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
  organizationId,
}: CampaignAnalysisDrawerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CopilotAnalysisResult | null>(null)
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null)

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
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError({
          message: data.error || 'Erro ao analisar campanha',
          detail: data.detail,
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

  const StatusIcon =
    status === 'CRITICAL' ? AlertTriangle : status === 'WARNING' ? TrendingDown : TrendingUp
  const statusColor =
    status === 'CRITICAL'
      ? 'text-red-500'
      : status === 'WARNING'
        ? 'text-amber-500'
        : 'text-green-500'
  const statusBg =
    status === 'CRITICAL'
      ? 'bg-red-50 border-red-100'
      : status === 'WARNING'
        ? 'bg-amber-50 border-amber-100'
        : 'bg-green-50 border-green-100'
  const statusBadgeColor =
    status === 'CRITICAL'
      ? 'bg-red-100 text-red-700'
      : status === 'WARNING'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-green-100 text-green-700'

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="flex flex-col overflow-y-auto p-0"
        style={{ width: '45vw', maxWidth: '45vw', minWidth: '400px' }}
        side="right"
      >
        {/* Header Section */}
        <div className="sticky top-0 z-10 shrink-0 border-b bg-slate-50 px-6 py-5">
          <SheetHeader>
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-800">
                Agente Analítico de BI
              </h2>
            </div>
            <SheetTitle className="text-foreground truncate text-xl font-bold leading-tight">
              {campaignName}
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm font-medium text-slate-500">
              Insights diagnosticados sobre os últimos 14 dias de performance macro.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Body Content */}
        <div className="flex-1 space-y-8 overflow-y-auto bg-white p-6">
          {/* ── Loading ── */}
          {isLoading && (
            <div className="space-y-6">
              <div className="text-muted-foreground/60 flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 py-16">
                <Activity className="h-12 w-12 animate-pulse text-indigo-400" />
                <div className="text-center">
                  <p className="animate-pulse font-semibold text-slate-600">
                    Agregando métricas e elaborando diagnóstico...
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Este processo analisa o funil completo usando OpenAI GPT-4o.
                  </p>
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
            <div className="bg-destructive/5 border-destructive/20 text-destructive flex items-start gap-3 rounded-xl border p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold">A análise não pôde ser completada</h4>
                <p className="text-sm leading-relaxed opacity-90">{error.message}</p>
                {error.detail && (
                  <div className="boreder-t border-destructive/10 mt-2 pt-2">
                    <p className="text-xs opacity-75">{error.detail}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Result ── */}
          {!isLoading && result && analysis && (
            <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both space-y-8 duration-500">
              {/* Executive Summary */}
              <div className={`relative overflow-hidden rounded-xl border p-6 ${statusBg}`}>
                <div className="mb-3 flex items-center justify-between border-b border-black/5 pb-3">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                    <h3 className="text-sm font-bold tracking-tight text-slate-800">
                      Síntese Executiva
                    </h3>
                  </div>
                  <span
                    className={`rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusBadgeColor}`}
                  >
                    Veredito: {status}
                  </span>
                </div>
                <p className="text-[15px] font-medium leading-relaxed text-slate-700">
                  {executiveSummary}
                </p>
              </div>

              {/* Charts - Two clear macro views */}
              {timeline.length > 0 && (
                <div className="space-y-5">
                  {/* Chart 1: Financeiro */}
                  <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">
                      <BarChart3 className="h-4 w-4 text-slate-500" />
                      <h4 className="text-sm font-semibold text-slate-700">
                        Fluxo Financeiro (Gasto x Faturamento)
                      </h4>
                    </div>
                    <div className="h-[220px] w-full p-4 pb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={timeline}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) =>
                              new Date(val).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              })
                            }
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
                            contentStyle={{
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              fontSize: '12px',
                            }}
                            labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                            formatter={(value: any, name: any) => {
                              if (!value) return [0, name]
                              return [formatCurrencyBRL(Number(value)), name]
                            }}
                          />
                          <Bar
                            dataKey="spend"
                            name="Gasto Ocorrido"
                            fill="#cbd5e1"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={30}
                          >
                            <LabelList
                              dataKey="spend"
                              position="top"
                              formatter={(val: any) => (Number(val) > 0 ? `R$${val}` : '')}
                              style={{ fontSize: '10px', fill: '#94a3b8' }}
                            />
                          </Bar>
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Retorno (ROAS)"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 0 }}
                            activeDot={{ r: 4 }}
                          >
                            <LabelList
                              dataKey="revenue"
                              position="top"
                              formatter={(val: any) => (Number(val) > 0 ? `R$${val}` : '')}
                              style={{ fontSize: '10px', fill: '#059669', fontWeight: 'bold' }}
                            />
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Eficiência (CPA x Conversões) */}
                  <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">
                      <LineChart className="h-4 w-4 text-slate-500" />
                      <h4 className="text-sm font-semibold text-slate-700">
                        Curva de Esforço (CPA vs Volume)
                      </h4>
                    </div>
                    <div className="h-[220px] w-full p-4 pb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={timeline}
                          margin={{ top: 10, right: -10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) =>
                              new Date(val).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              })
                            }
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
                            contentStyle={{
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              fontSize: '12px',
                            }}
                            labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                            formatter={(value: any, name: any) => {
                              if (!value) return [0, name]
                              if (name === 'Custo por Aquisição (CPA)')
                                return [formatCurrencyBRL(Number(value)), name]
                              return [value, name]
                            }}
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="cpa"
                            name="Custo por Aquisição (CPA)"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            strokeDasharray="4 4"
                          >
                            <LabelList
                              dataKey="cpa"
                              position="top"
                              formatter={(val: any) => (Number(val) > 0 ? `R$${val}` : '')}
                              style={{ fontSize: '10px', fill: '#ef4444' }}
                            />
                          </Line>
                          <Bar
                            yAxisId="right"
                            dataKey="purchases"
                            name="Volume de Compras"
                            fill="#6366f1"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={30}
                            opacity={0.8}
                          >
                            <LabelList
                              dataKey="purchases"
                              position="top"
                              formatter={(val: any) => (Number(val) > 0 ? val : '')}
                              style={{ fontSize: '10px', fill: '#4f46e5', fontWeight: 'bold' }}
                            />
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
                  <h3 className="mb-4 border-b pb-2 text-sm font-bold tracking-tight text-slate-800">
                    Diagnóstico de Causa-Raiz Sistêmica
                  </h3>
                  {!deepDiagnostics || deepDiagnostics.length === 0 ? (
                    <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-500">
                      A estrutura opera de maneira excepcionalmente previsível e limpa. Nenhum
                      ofensor relevante detectado.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deepDiagnostics.map((d, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${d.severity === 'high' ? 'bg-red-500' : d.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-400'}`}
                            />
                            <span className="text-[13px] font-bold text-slate-800">{d.area}</span>
                          </div>
                          <div className="ml-4 mt-3 space-y-2">
                            <div>
                              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Fato Observado
                              </span>
                              <p className="text-[13px] leading-snug text-slate-600">
                                {d.observation}
                              </p>
                            </div>
                            <div className="rounded border border-slate-100 bg-slate-50 p-2.5">
                              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                Diagnóstico Causa-Raiz
                              </span>
                              <p className="text-[13px] font-medium leading-snug text-slate-700">
                                {d.rootCause}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Plan */}
                <div>
                  <h3 className="mb-4 border-b pb-2 text-sm font-bold tracking-tight text-slate-800">
                    Roadmap de Correção (Macro)
                  </h3>
                  {!keyRecommendations || keyRecommendations.length === 0 ? (
                    <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-500">
                      Nenhuma ação necessária no escopo de campanha no momento.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...keyRecommendations]
                        .sort((a, b) => a.priority - b.priority)
                        .map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3.5"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 shadow-sm shadow-indigo-200">
                              {r.priority}
                            </div>
                            <span className="text-[14px] font-medium leading-snug text-slate-800">
                              {r.action}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <p className="mb-4 mt-8 text-center text-xs text-slate-400">
                Análise processada sistemicamente por OpenAI GPT-4o.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
