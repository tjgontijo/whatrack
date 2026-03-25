'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Ban, Clock, Copy, Users, CheckCircle2, Eye, MousePointerClick, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectPath, useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { CampaignAbMetrics } from '@/components/dashboard/campaigns/campaign-ab-metrics'
import { CampaignRecipientsTable } from '@/components/dashboard/campaigns/campaign-recipients-table'
import { DashboardMetricCard, DashboardMetricGrid } from '@/components/dashboard/charts/card'
import { FunnelChart } from '@/components/dashboard/charts/funnel-chart'
import { DashboardPieChart } from '@/components/dashboard/charts/pie'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Pendente',
  APPROVED: 'Aprovada',
  SCHEDULED: 'Agendada',
  PROCESSING: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  PENDING: 'Pendente',
  SENT: 'Enviada',
  DELIVERED: 'Entregue',
  READ: 'Lida',
  FAILED: 'Falhou',
  EXCLUDED: 'Excluído',
  RESPONDED: 'Resposta',
}

const STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PENDING_APPROVAL: 'outline',
  APPROVED: 'outline',
  SCHEDULED: 'default',
  PROCESSING: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
  PENDING: 'secondary',
  SENT: 'outline',
  DELIVERED: 'outline',
  READ: 'secondary',
  FAILED: 'destructive',
  EXCLUDED: 'destructive',
  RESPONDED: 'default',
}

const TYPE_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  OPERATIONAL: 'Operacional',
}

interface DispatchGroup {
  id: string
  templateName: string
  templateLang: string
  status: string
  totalCount: number
  processedCount: number
  successCount: number
  failCount: number
  configDisplayPhone: string | null
  configVerifiedName: string | null
}

interface CampaignEvent {
  id: string
  type: string
  metadata: any
  createdAt: string
}

interface CampaignDetail {
  id: string
  name: string
  type: string
  status: string
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  templateName: string | null
  projectId: string
  projectName: string | null
  createdAt: string
  createdByName: string | null
  approvedByName: string | null
  approvedAt: string | null
  totalRecipients: number
  totalDispatchGroups: number
  dispatchGroups: DispatchGroup[]
  events: CampaignEvent[]
  isAbTest: boolean
  abTestConfig: any | null
}

export default function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const campaignsPath = useRequiredProjectPath('/campaigns')
  const { organizationId } = useRequiredProjectRouteContext()
  const { campaignId } = React.use(params)

  const { data: campaign, isLoading } = useQuery<CampaignDetail>({
    queryKey: ['whatsapp-campaign', organizationId, campaignId],
    queryFn: async () => {
      const data = await apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}`, {
        orgId: organizationId,
      })
      return data as CampaignDetail
    },
    enabled: !!organizationId && !!campaignId,
  })

  interface CampaignStats { status: string; total: number; sent: number; delivered: number; read: number; responded: number; failed: number; pending: number; success: number }
  const { data: stats } = useQuery<CampaignStats>({
    queryKey: ['whatsapp-campaign-stats', organizationId, campaignId],
    queryFn: async () => {
      const data = await apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/stats`, {
        orgId: organizationId,
      })
      return data as CampaignStats
    },
    enabled: !!organizationId && !!campaignId,
    refetchInterval: (query) => {
      const s = query.state.data as CampaignStats | undefined
      return s?.status === 'PROCESSING' ? 2000 : false
    },
  })

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const isScheduled = !!campaign?.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now()
      return apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
        orgId: organizationId,
        body: JSON.stringify(isScheduled ? { immediate: false, scheduledAt: campaign.scheduledAt } : { immediate: true }),
      })
    },
    onSuccess: () => {
      toast.success(campaign?.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now() ? 'Campanha agendada!' : 'Campanha disparada!')
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaign', organizationId, campaignId] })
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  })

  const cancelMutation = useMutation({
    mutationFn: async () => apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/cancel`, { method: 'POST', orgId: organizationId, body: JSON.stringify({}) }),
    onSuccess: () => {
      toast.success('Campanha cancelada')
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaign', organizationId, campaignId] })
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  })

  const retryFailedMutation = useMutation({
    mutationFn: async () => apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/retry-failed`, { method: 'POST', orgId: organizationId }),
    onSuccess: (data: any) => {
      toast.success(data.message || 'Reenvio agendado!')
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaign', organizationId, campaignId] })
    },
    onError: (error: Error) => toast.error('Erro ao reenviar', { description: error.message }),
  })

  const duplicateMutation = useMutation({
    mutationFn: async () => apiFetch(`/api/v1/whatsapp/campaigns/${campaignId}/duplicate`, { method: 'POST', orgId: organizationId }),
    onSuccess: (data: any) => {
      toast.success(`Campanha duplicada: ${data.name}`)
      router.push(`${campaignsPath}/${data.campaignId}`)
    },
    onError: (error: Error) => toast.error('Erro ao duplicar', { description: error.message }),
  })

  if (!campaignId) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando painel analítico...</p>
      </div>
    )
  }

  const s = stats || { total: 0, sent: 0, delivered: 0, read: 0, responded: 0, failed: 0, pending: 0 }
  const deliveryRate = s.sent > 0 ? (s.delivered / s.sent) * 100 : 0
  const readRate = s.delivered > 0 ? (s.read / s.delivered) * 100 : 0
  const responseRate = s.read > 0 ? (s.responded / s.read) * 100 : 0

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Hero Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between pb-4 border-b">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-background" asChild>
            <Link href={campaignsPath}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col gap-1.5">
            {isLoading ? (
              <Skeleton className="h-8 w-[280px]" />
            ) : (
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground uppercase">{campaign?.name}</h1>
            )}
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <>
                  <Badge variant={STATUS_VARIANTS[campaign?.status || ''] || 'secondary'} className="px-2 py-0.5 uppercase tracking-wide text-[10px] font-bold">
                    {STATUS_LABELS[campaign?.status || ''] || campaign?.status}
                  </Badge>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                    {TYPE_LABELS[campaign?.type || ''] || campaign?.type}
                  </span>
                  {campaign?.isAbTest && (
                    <Badge variant="outline" className="bg-purple-100/50 text-purple-700 border-purple-200 text-[10px] font-bold">
                      A/B Test
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {!isLoading && campaign && (
          <div className="flex items-center gap-2">
            {['DRAFT', 'APPROVED'].includes(campaign.status) && (
              <Button onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending} className="bg-primary hover:bg-primary/90">
                <Send className="mr-2 h-4 w-4" />
                {campaign.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now() ? 'Agendar' : 'Enviar'}
              </Button>
            )}
            {['COMPLETED', 'FAILED', 'CANCELLED'].includes(campaign.status) && (campaign.dispatchGroups.some(g => g.failCount > 0) || campaign.status === 'CANCELLED') && (
              <Button variant="outline" size="sm" onClick={() => retryFailedMutation.mutate()} disabled={retryFailedMutation.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retomar Falhas
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}>
              <Copy className="mr-2 h-4 w-4" /> Duplicar
            </Button>
            {['DRAFT', 'APPROVED', 'SCHEDULED', 'PROCESSING'].includes(campaign.status) && (
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                <Ban className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[120px] w-full rounded-2xl" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      ) : campaign ? (
        <>
          {/* 2. KPIs */}
          {stats && (
            <DashboardMetricGrid>
              <DashboardMetricCard
                title="Audiência Processada"
                value={s.total.toLocaleString('pt-BR')}
                trend={`${s.sent} disparos executados`}
                icon={<Users className="w-4 h-4 text-muted-foreground/50" />}
              />
              <DashboardMetricCard
                title="Taxa de Entrega"
                value={s.sent > 0 ? `${deliveryRate.toFixed(1)}%` : '—'}
                trend={`Entregue a ${s.delivered} contatos`}
                icon={<CheckCircle2 className="w-4 h-4 text-muted-foreground/50" />}
              />
              <DashboardMetricCard
                title="Taxa de Abertura"
                value={s.delivered > 0 ? `${readRate.toFixed(1)}%` : '—'}
                trend={`Lido por ${s.read} contatos`}
                icon={<Eye className="w-4 h-4 text-muted-foreground/50" />}
              />
              <DashboardMetricCard
                title="Engajamento"
                value={s.read > 0 ? `${responseRate.toFixed(1)}%` : '—'}
                trend={`${s.responded} respostas coletadas`}
                icon={<MousePointerClick className="w-4 h-4 text-muted-foreground/50" />}
              />
            </DashboardMetricGrid>
          )}

          {/* 3. Charts Row */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                 <FunnelChart
                   title="Régua de Engajamento"
                   description="O percurso dos seus clientes pela campanha até a conversão."
                   colors={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']}
                   steps={[
                     { label: 'Enviados', value: s.sent },
                     { label: 'Entregues', value: s.delivered },
                     { label: 'Lidos', value: s.read },
                     { label: 'Respostas', value: s.responded },
                   ]}
                 />
              </div>
              <div className="lg:col-span-4">
                 <Card className="shadow-[0px_18px_35px_-25px_rgba(15,23,42,0.25)] border-border/60 bg-card rounded-3xl h-full backdrop-blur-sm overflow-hidden flex flex-col pt-2">
                   <CardHeader className="pb-0 shrink-0 px-6">
                     <CardTitle className="text-sm font-semibold">Status do Roteamento</CardTitle>
                     <CardDescription className="text-[11px]">Proporção final de entrega.</CardDescription>
                   </CardHeader>
                   <CardContent className="flex-1 pb-4 pt-0 px-0 flex flex-col justify-center overflow-hidden">
                     <DashboardPieChart
                       className="border-none shadow-none bg-transparent p-0 m-0 w-full"
                       height={280}
                       innerRadius={0.75}
                       padAngle={3}
                       cornerRadius={6}
                       margin={{ top: 20, right: 70, bottom: 20, left: 70 }}
                       data={[
                         { id: 'delivered', label: 'Sucesso', value: s.delivered + s.read + s.responded, color: '#10b981' }, 
                         { id: 'failed', label: 'Rejeitado', value: s.failed + (campaign.dispatchGroups.reduce((acc,g) => acc + g.failCount, 0)), color: '#ef4444' }, 
                         { id: 'pending', label: 'Fila', value: s.pending, color: '#f59e0b' }, 
                       ]}
                       colors={{ datum: 'data.color' }}
                     />
                   </CardContent>
                 </Card>
              </div>
            </div>
          )}

          {campaign.isAbTest && (
            <CampaignAbMetrics
              campaignId={campaignId}
              campaignStatus={campaign.status}
              abTestConfig={campaign.abTestConfig}
            />
          )}

          {/* 4. Tabela de Destinatários */}
          <div className="pt-4">
             <CampaignRecipientsTable campaignId={campaignId} />
          </div>
        </>
      ) : null}
    </div>
  )
}
