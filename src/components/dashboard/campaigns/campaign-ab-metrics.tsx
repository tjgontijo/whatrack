'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trophy, Crown, Timer, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'

interface VariantMetric {
  variantId: string
  label: string
  templateName: string
  splitPercent: number
  totalCount: number
  sentCount: number
  deliveredCount: number
  readCount: number
  respondedCount: number
  failCount: number
  responseRate: number
  readRate: number
}

interface AbTestConfig {
  windowHours: number
  winnerCriteria: 'RESPONSE_RATE' | 'READ_RATE' | 'MANUAL'
  remainderPercent: number
  winnerVariantId: string | null
  winnerSelectedAt: string | null
}

interface AbTestData {
  config: AbTestConfig
  status: string
  metrics: VariantMetric[]
  leaderId: string | null
  windowRemainingMs: number | null
}

const CRITERIA_LABELS: Record<string, string> = {
  RESPONSE_RATE: 'Taxa de resposta',
  READ_RATE: 'Taxa de leitura',
  MANUAL: 'Manual',
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function formatRemainingTime(ms: number) {
  if (ms <= 0) return 'Janela encerrada'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m restantes`
  return `${m}m restantes`
}

interface CampaignAbMetricsProps {
  campaignId: string
  campaignStatus: string
  abTestConfig: AbTestConfig | null
}

export function CampaignAbMetrics({ campaignId, campaignStatus, abTestConfig }: CampaignAbMetricsProps) {
  const { organizationId } = useRequiredProjectRouteContext()
  const queryClient = useQueryClient()

  const isProcessing = campaignStatus === 'PROCESSING'

  const { data, isLoading } = useQuery<AbTestData>({
    queryKey: ['campaign-ab-metrics', organizationId, campaignId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/ab`, {
        orgId: organizationId,
      })
      return res as AbTestData
    },
    enabled: !!organizationId && !!campaignId,
    refetchInterval: isProcessing ? 5000 : false,
  })

  const selectWinnerMutation = useMutation({
    mutationFn: async (variantId: string) => {
      return apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/ab/select-winner`, {
        method: 'POST',
        orgId: organizationId,
        body: JSON.stringify({ variantId }),
      })
    },
    onSuccess: () => {
      toast.success('Vencedor selecionado! O restante da audiência será enviado.')
      queryClient.invalidateQueries({ queryKey: ['campaign-ab-metrics', organizationId, campaignId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaign', organizationId, campaignId] })
    },
    onError: (err: Error) => {
      toast.error('Erro ao selecionar vencedor', { description: err.message })
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Teste A/B
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando métricas...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { config, metrics, leaderId, windowRemainingMs } = data
  const winnerVariantId = config?.winnerVariantId
  const criterion = config?.winnerCriteria ?? 'RESPONSE_RATE'
  const isManual = criterion === 'MANUAL'
  const canSelectWinner = !winnerVariantId && (isManual || (windowRemainingMs !== null && windowRemainingMs <= 0))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Teste A/B
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Critério: {CRITERIA_LABELS[criterion] ?? criterion}</span>
            {config?.windowHours && (
              <>
                <span>·</span>
                {winnerVariantId ? (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Vencedor selecionado
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" />
                    {windowRemainingMs !== null ? formatRemainingTime(windowRemainingMs) : `Janela: ${config.windowHours}h`}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Window progress bar */}
        {!winnerVariantId && windowRemainingMs !== null && config?.windowHours && (
          <div className="mt-2">
            <Progress
              value={Math.max(0, Math.min(100, 100 - (windowRemainingMs / (config.windowHours * 3600000)) * 100))}
              className="h-1.5"
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Variant cards */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 3)}, 1fr)` }}>
          {metrics.map((m) => {
            const isWinner = winnerVariantId === m.variantId
            const isLeader = !winnerVariantId && leaderId === m.variantId
            const rate = criterion === 'RESPONSE_RATE' ? m.responseRate : m.readRate

            return (
              <div
                key={m.variantId}
                className={`rounded-lg border p-4 space-y-3 transition-all ${isWinner ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : isLeader ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : ''}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{m.label}</span>
                    {isWinner && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 gap-1 text-xs">
                        <Crown className="h-3 w-3" />
                        Vencedor
                      </Badge>
                    )}
                    {isLeader && !isWinner && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-300 gap-1 text-xs">
                        <Trophy className="h-3 w-3" />
                        Líder
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">{m.splitPercent}%</Badge>
                </div>

                {/* Template */}
                <p className="text-xs text-muted-foreground truncate" title={m.templateName}>
                  {m.templateName}
                </p>

                {/* Key metric */}
                <div className="text-center py-2 rounded-md bg-muted/40">
                  <p className="text-2xl font-bold">{formatPercent(rate)}</p>
                  <p className="text-xs text-muted-foreground">
                    {criterion === 'RESPONSE_RATE' ? 'Taxa de resposta' : 'Taxa de leitura'}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">{m.totalCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Enviados</p>
                    <p className="font-semibold">{m.sentCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lidos</p>
                    <p className="font-semibold text-blue-600">{m.readCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Responderam</p>
                    <p className="font-semibold text-green-600">{m.respondedCount}</p>
                  </div>
                </div>

                {/* Select winner button */}
                {canSelectWinner && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    disabled={selectWinnerMutation.isPending}
                    onClick={() => selectWinnerMutation.mutate(m.variantId)}
                  >
                    {selectWinnerMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Crown className="h-3 w-3 mr-1" />
                    )}
                    Promover como vencedor
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Remainder info */}
        {config?.remainderPercent > 0 && (
          <p className="mt-4 text-xs text-muted-foreground text-center">
            {config.remainderPercent}% da audiência será enviada com o template vencedor.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
