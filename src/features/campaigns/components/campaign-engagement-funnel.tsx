'use client'

import { ChevronRight } from 'lucide-react'
import React from 'react'
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
    {
      label: 'Entregues',
      value: stats.delivered,
      percent: formatPercent(stats.delivered, stats.sent),
    },
    { label: 'Lidos', value: stats.read, percent: formatPercent(stats.read, stats.delivered) },
    {
      label: 'Responderam',
      value: stats.responded,
      percent: formatPercent(stats.responded, stats.read),
    },
  ]

  const hasData = stats.sent > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Funil de Engajamento</CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {hasData ? (
          <>
            {/* Funnel Horizontal */}
            <div className='flex items-center gap-2 overflow-x-auto pb-2'>
              {stages.map((stage, idx) => (
                <React.Fragment key={stage.label}>
                  <div
                    className={`flex-shrink-0 rounded-lg border-2 px-4 py-3 text-center transition-opacity ${
                      stage.value === 0
                        ? 'border-border bg-muted opacity-40'
                        : 'border-primary/20 bg-primary/5'
                    }`}
                    style={{
                      minWidth: `${Math.max(100, (stage.value / stats.sent) * 200)}px`,
                    }}
                  >
                    <div className='font-semibold text-sm'>
                      {stage.value.toLocaleString('pt-BR')}
                    </div>
                    <div className='text-muted-foreground text-xs'>{stage.label}</div>
                    {stage.percent && (
                      <div className='mt-1 font-medium text-primary text-xs'>{stage.percent}</div>
                    )}
                  </div>
                  {idx < stages.length - 1 && (
                    <ChevronRight className='h-5 w-5 flex-shrink-0 text-muted-foreground' />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Failure and Pending Summary */}
            <div className='grid grid-cols-2 gap-3 border-t pt-4'>
              <div className='rounded-lg border border-destructive/20 bg-destructive/5 p-3'>
                <div className='text-muted-foreground text-xs'>Falhados/Excluídos</div>
                <div className='font-semibold text-sm'>{stats.failed.toLocaleString('pt-BR')}</div>
              </div>
              <div className='rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3'>
                <div className='text-muted-foreground text-xs'>Pendentes</div>
                <div className='font-semibold text-sm'>{stats.pending.toLocaleString('pt-BR')}</div>
              </div>
            </div>
          </>
        ) : (
          <div className='py-8 text-center text-muted-foreground'>
            <p>Nenhum dado de engajamento disponível ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
