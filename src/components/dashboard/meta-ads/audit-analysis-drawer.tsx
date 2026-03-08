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
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Activity,
  Lightbulb,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetaAdsAnalystResult {
  insightId: string
  healthScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  pixelCapiScore?: number
  creativeScore?: number
  structureScore?: number
  audienceScore?: number
  criticalFindings: string[]
  highPriorityFindings?: string[]
  quickWins: string[]
  summary: string
}

interface AuditAnalysisDrawerProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  organizationId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditAnalysisDrawer({
  isOpen,
  onClose,
  accountId,
  organizationId,
}: AuditAnalysisDrawerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<MetaAdsAnalystResult | null>(null)
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null)

  React.useEffect(() => {
    if (isOpen && accountId && !result) {
      handleAudit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accountId])

  const handleAudit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/v1/meta-ads/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
        orgId: organizationId,
      })
      setResult(data as MetaAdsAnalystResult)
    } catch (err: any) {
      setError({ message: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  // Grade color mapping
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-50 border-green-200 text-green-900'
      case 'B':
        return 'bg-blue-50 border-blue-200 text-blue-900'
      case 'C':
        return 'bg-amber-50 border-amber-200 text-amber-900'
      case 'D':
        return 'bg-orange-50 border-orange-200 text-orange-900'
      case 'F':
        return 'bg-red-50 border-red-200 text-red-900'
      default:
        return 'bg-slate-50 border-slate-200 text-slate-900'
    }
  }

  // Score bar color
  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-slate-300'
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const ScoreCard = ({
    title,
    score,
  }: {
    title: string
    score?: number
  }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold text-slate-700">{title}</p>
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full ${getScoreColor(score)} transition-all`}
            style={{ width: `${Math.min(score ?? 0, 100)}%` }}
          />
        </div>
        <p className="text-right text-sm font-bold text-slate-900">
          {score?.toFixed(0) || 'N/A'}/100
        </p>
      </div>
    </div>
  )

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
                <BarChart3 className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-800">
                Auditoria de Meta Ads
              </h2>
            </div>
            <SheetTitle className="text-foreground text-xl font-bold leading-tight">
              Análise Estruturada
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm font-medium text-slate-500">
              Framework de 46 checks para saúde da conta
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Body Content */}
        <div className="flex-1 space-y-6 overflow-y-auto bg-white p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-6">
              <div className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 py-16">
                <Activity className="h-12 w-12 animate-pulse text-indigo-400" />
                <div className="text-center">
                  <p className="animate-pulse font-semibold text-slate-600">
                    Analisando conta...
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Aplicando framework de 46 checks
                  </p>
                </div>
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-900">Erro ao processar auditoria</h4>
                <p className="text-sm leading-relaxed text-red-800">{error.message}</p>
              </div>
            </div>
          )}

          {/* Result State */}
          {!isLoading && result && (
            <div className="space-y-6">
              {/* Grade Card */}
              <div className={`rounded-xl border-2 p-6 ${getGradeColor(result.grade)}`}>
                <p className="mb-2 text-sm font-semibold opacity-75">Score Geral</p>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-5xl font-bold">{result.grade}</p>
                    <p className="mt-1 text-sm opacity-75">{result.healthScore?.toFixed(0)}/100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold opacity-75 uppercase">Saúde da Conta</p>
                  </div>
                </div>
              </div>

              {/* Category Scores Grid */}
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">Categoria Scores</p>
                <div className="grid grid-cols-2 gap-3">
                  <ScoreCard title="Pixel/CAPI Health" score={result.pixelCapiScore} />
                  <ScoreCard title="Creative Diversity" score={result.creativeScore} />
                  <ScoreCard title="Account Structure" score={result.structureScore} />
                  <ScoreCard title="Audience & Targeting" score={result.audienceScore} />
                </div>
              </div>

              {/* Summary Card */}
              <div className="rounded-lg border border-slate-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900">{result.summary}</p>
              </div>

              {/* Critical Findings */}
              {result.criticalFindings && result.criticalFindings.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-semibold text-slate-700">Achados Críticos</p>
                  </div>
                  <div className="space-y-2">
                    {result.criticalFindings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                      >
                        • {finding}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High Priority Findings */}
              {result.highPriorityFindings && result.highPriorityFindings.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-semibold text-slate-700">Alta Prioridade</p>
                  </div>
                  <div className="space-y-2">
                    {result.highPriorityFindings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                      >
                        • {finding}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Wins */}
              {result.quickWins && result.quickWins.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-semibold text-slate-700">Quick Wins</p>
                  </div>
                  <div className="space-y-2">
                    {result.quickWins.map((win, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900"
                      >
                        ✓ {win}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
