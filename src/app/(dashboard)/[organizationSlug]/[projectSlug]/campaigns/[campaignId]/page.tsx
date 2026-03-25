'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Send, Ban, Clock, Copy, Users, CheckCircle2, Eye, MousePointerClick, RefreshCw, AlertCircle } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'

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
  RESPONDED: 'Interação',
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

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Criada',
  UPDATED: 'Atualizada',
  SNAPSHOT_GENERATED: 'Snapshot Gerado',
  SCHEDULED: 'Agendada',
  DISPATCH_STARTED: 'Disparo Iniciado',
  DISPATCH_COMPLETED: 'Disparo Concluído',
  DISPATCH_FAILED: 'Falha no Disparo',
  CANCELLED: 'Cancelada',
  LEGACY_STATUS_MIGRATED: 'Migrada',
  AB_WINNER_SELECTED: 'Vencedor A/B Definido',
  AB_REMAINDER_DISPATCHED: 'Disparo Restante Iniciado',
  AB_INSUFFICIENT_DATA: 'Dados A/B Insuficientes',
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

  // Polling a cada 2s para métricas dinâmicas.
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
      queryClient.invalidateQueries({ queryKey: ['campaign-recipients', organizationId, campaignId] }) // Just clear cache
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
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{campaign?.name}</h1>
            )}
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <>
                  <Badge variant={STATUS_VARIANTS[campaign?.status || ''] || 'secondary'} className="px-2 py-0.5 uppercase tracking-wide text-[10px] font-bold">
                    {STATUS_LABELS[campaign?.status || ''] || campaign?.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {TYPE_LABELS[campaign?.type || ''] || campaign?.type}
                  </span>
                  {campaign?.isAbTest && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300">
                      Variação A/B
                    </Badge>
                  )}
                  {campaign?.scheduledAt && (
                    <span className="text-muted-foreground/70 text-xs flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3" />
                      {new Date(campaign.scheduledAt).toLocaleString('pt-BR')}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {!isLoading && campaign && (
          <div className="flex items-center gap-2">
            {['DRAFT', 'APPROVED'].includes(campaign.status) && (
              <Button onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending} className="shadow-lg hover:-translate-y-0.5 transition-transform bg-blue-600 hover:bg-blue-700 text-white">
                <Send className="mr-2 h-4 w-4" />
                {campaign.scheduledAt && new Date(campaign.scheduledAt).getTime() > Date.now() ? 'Agendar Disparo' : 'Iniciar Disparo'}
              </Button>
            )}
            {['COMPLETED', 'FAILED', 'CANCELLED'].includes(campaign.status) && (campaign.dispatchGroups.some(g => g.failCount > 0) || campaign.status === 'CANCELLED') && (
              <Button variant="secondary" onClick={() => retryFailedMutation.mutate()} disabled={retryFailedMutation.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retomar Falhas
              </Button>
            )}
            <Button variant="outline" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending} className="bg-background">
              <Copy className="mr-2 h-4 w-4" /> Duplicar
            </Button>
            {['DRAFT', 'APPROVED', 'SCHEDULED', 'PROCESSING'].includes(campaign.status) && (
              <Button variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                <Ban className="mr-2 h-4 w-4" /> Interromper
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
          {/* 2. KPIs de Conversão */}
          {stats && (
            <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 fill-mode-both">
              <DashboardMetricGrid>
                <DashboardMetricCard
                  title="Audiência Processada"
                  value={s.total.toLocaleString('pt-BR')}
                  trend={s.sent > 0 ? `${s.sent} disparos executados` : 'Aguardando início'}
                  icon={<Users className="w-5 h-5 text-muted-foreground" />}
                />
                <DashboardMetricCard
                  title="Taxa de Entrega"
                  value={s.sent > 0 ? `${deliveryRate.toFixed(1)}%` : '—'}
                  trend={s.sent > 0 ? `Entregue a ${s.delivered} contatos` : '—'}
                  icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />}
                />
                <DashboardMetricCard
                  title="Taxa de Abertura"
                  value={s.delivered > 0 ? `${readRate.toFixed(1)}%` : '—'}
                  trend={s.delivered > 0 ? `Lido por ${s.read} contatos` : '—'}
                  icon={<Eye className="w-5 h-5 text-purple-500" />}
                />
                <DashboardMetricCard
                  title="Engajamento"
                  value={s.read > 0 ? `${responseRate.toFixed(1)}%` : '—'}
                  trend={s.read > 0 ? `${s.responded} respostas coletadas` : '—'}
                  icon={<MousePointerClick className="w-5 h-5 text-emerald-500" />}
                />
              </DashboardMetricGrid>
            </div>
          )}

          {/* 3. Composição Visual (Funil + Rosca) */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-3 fade-in duration-500 fill-mode-both delay-100">
              <div className="lg:col-span-8">
                 <FunnelChart
                   title="Régua de Engajamento"
                   description="O percurso dos seus clientes pela campanha até a conversão."
                   colors={['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe']}
                   steps={[
                     { label: 'Enviados', value: s.sent, helper: 'Acionados pela plataforma' },
                     { label: 'Entregues', value: s.delivered, helper: 'O WhatsApp reconheceu o recebimento' },
                     { label: 'Lidos', value: s.read, helper: 'Visualizações confirmadas' },
                     { label: 'Respostas', value: s.responded, helper: 'Interações e engajamento' },
                   ]}
                 />
              </div>
              <div className="lg:col-span-4">
                 <Card className="shadow-[0px_18px_35px_-25px_rgba(15,23,42,0.25)] border-border/60 bg-card rounded-3xl h-full backdrop-blur-sm overflow-hidden flex flex-col">
                   <CardHeader className="pb-0 shrink-0">
                     <CardTitle className="text-sm font-semibold">Status do Roteamento</CardTitle>
                     <CardDescription className="text-xs">Proporção final de entrega.</CardDescription>
                   </CardHeader>
                   <CardContent className="flex-1 pb-6 pt-4 flex flex-col justify-center">
                     <DashboardPieChart
                       className="border-none shadow-none bg-transparent p-0 m-0 w-full"
                       height={220}
                       innerRadius={0.7}
                       padAngle={1.5}
                       cornerRadius={4}
                       margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
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

          {campaign.isAbTest ? (
            <CampaignAbMetrics
              campaignId={campaignId}
              campaignStatus={campaign.status}
              abTestConfig={campaign.abTestConfig}
            />
          ) : campaign.dispatchGroups.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 fade-in duration-500 fill-mode-both delay-200">
              
              {/* Grupos de Envio Modernos */}
              <Card className="rounded-3xl border-border/60 shadow-sm bg-background">
                <CardHeader>
                  <CardTitle className="text-[15px]">Infraestrutura de Disparo</CardTitle>
                  <CardDescription className="text-xs">Rotas e instâncias utilizadas para a transmissão.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaign.dispatchGroups.map((group) => {
                       const groupTotal = group.totalCount;
                       const groupDone = group.successCount + group.failCount;
                       const progress = groupTotal > 0 ? (groupDone / groupTotal) * 100 : 0;
                       
                       return (
                        <div key={group.id} className="rounded-2xl border bg-muted/20 p-4 transition-all hover:bg-muted/40">
                          <div className="mb-3 flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm leading-none">{group.templateName}</p>
                              <p className="text-muted-foreground text-[11px] font-mono tracking-tight">Rota: {group.configDisplayPhone || 'Desconhecida'}</p>
                            </div>
                            <Badge variant={STATUS_VARIANTS[group.status] || 'secondary'} className="text-[10px] lowercase px-1.5 font-bold tracking-widest whitespace-nowrap">
                              {STATUS_LABELS[group.status] || group.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                               <span>Progresso</span>
                               <span>{progress.toFixed(0)}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase opacity-80">Volumetria</span>
                              <span>{group.totalCount} msg</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase opacity-80">Sucedidos</span>
                              <span className="text-emerald-600 dark:text-emerald-500">{group.successCount} msg</span>
                            </div>
                            {group.failCount > 0 && (
                               <div className="flex flex-col">
                                 <span className="text-[10px] text-muted-foreground uppercase opacity-80">Rejeitados</span>
                                 <span className="text-destructive">{group.failCount} msg</span>
                               </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Histórico Timeline Moderno */}
              <Card className="rounded-3xl border-border/60 shadow-sm bg-background">
                <CardHeader>
                  <CardTitle className="text-[15px]">Linha do Tempo</CardTitle>
                  <CardDescription className="text-xs">Registro temporal dos eventos da campanha.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative border-l border-muted-foreground/15 ml-3 pl-6 space-y-6 pt-2 pb-4">
                    {campaign.events?.map((event) => {
                      const typeLabel = EVENT_LABELS[event.type] || event.type;
                      const isSuccess = ['DISPATCH_COMPLETED', 'AB_WINNER_SELECTED', 'AB_REMAINDER_DISPATCHED'].includes(event.type);
                      const isFailure = ['DISPATCH_FAILED', 'AB_INSUFFICIENT_DATA', 'CANCELLED'].includes(event.type);

                      return (
                      <div key={event.id} className="relative">
                        <span className="absolute -left-[35px] flex items-center justify-center w-5 h-5 rounded-full bg-background ring-4 ring-background">
                          {isSuccess ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : isFailure ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-500" />
                          )}
                        </span>
                        
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold tracking-tight text-foreground/90">
                            {typeLabel}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                            <span className="font-medium bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground border">
                             {event.metadata?.userName || 'Sistema Platform'}
                            </span>
                            <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                          </div>
                          {event.metadata?.comment && (
                            <p className="text-xs text-muted-foreground italic mt-1 bg-muted/30 p-2 rounded border border-dashed">
                               "{event.metadata.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                </CardContent>
              </Card>

            </div>
          ) : null}

          {/* 4. Tabela de Destinatários (Infinite Scroll) */}
          <div className="animate-in slide-in-from-bottom-5 fade-in duration-500 fill-mode-both delay-300">
             <CampaignRecipientsTable campaignId={campaignId} />
          </div>
        </>
      ) : null}
    </div>
  )
}
