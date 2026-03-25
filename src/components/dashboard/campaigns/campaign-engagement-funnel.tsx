'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CampaignStats {
  total: number
  sent: number
  delivered: number
  read: number
  responded: number
  failed: number
  pending: number
}

interface CampaignEngagementFunnelProps {
  stats: CampaignStats
}

function formatPercent(current: number, previous: number): string {
  if (previous === 0) return '—'
  return `${((current / previous) * 100).toFixed(1)}%`
}

export function CampaignEngagementFunnel({ stats }: CampaignEngagementFunnelProps) {
  const stages = [
    { label: 'Enviados', value: stats.sent, percent: null },
    { label: 'Entregues', value: stats.delivered, percent: formatPercent(stats.delivered, stats.sent) },
    { label: 'Lidos', value: stats.read, percent: formatPercent(stats.read, stats.delivered) },
    { label: 'Responderam', value: stats.responded, percent: formatPercent(stats.responded, stats.read) },
  ]

  const hasData = stats.sent > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funil de Engajamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasData ? (
          <>
            {/* Funnel Horizontal */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {stages.map((stage, idx) => (
                <React.Fragment key={stage.label}>
                  <div
                    className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 text-center transition-opacity ${
                      stage.value === 0 ? 'opacity-40 bg-muted border-border' : 'bg-primary/5 border-primary/20'
                    }`}
                    style={{
                      minWidth: `${Math.max(100, (stage.value / stats.sent) * 200)}px`,
                    }}
                  >
                    <div className="font-semibold text-sm">{stage.value.toLocaleString('pt-BR')}</div>
                    <div className="text-xs text-muted-foreground">{stage.label}</div>
                    {stage.percent && <div className="text-xs font-medium text-primary mt-1">{stage.percent}</div>}
                  </div>
                  {idx < stages.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Failure and Pending Summary */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                <div className="text-xs text-muted-foreground">Falhados/Excluídos</div>
                <div className="font-semibold text-sm">{stats.failed.toLocaleString('pt-BR')}</div>
              </div>
              <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
                <div className="text-xs text-muted-foreground">Pendentes</div>
                <div className="font-semibold text-sm">{stats.pending.toLocaleString('pt-BR')}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum dado de engajamento disponível ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
