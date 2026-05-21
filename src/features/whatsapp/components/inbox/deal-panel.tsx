'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDot,
  Copy,
  DollarSign,
  Megaphone,
  MessageSquare,
  Microscope,
  Route,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Timer,
  User,
  type LucideIcon,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/http/api-client'
import { updateDealStageAction } from '@/features/deals/actions/update-deal-stage-action'
import { ConversationIntelligencePanel } from '@/features/conversation-intelligence/components/conversation-intelligence-panel'
import type { ChatItem } from './types'

interface DealPanelProps {
  conversationId: string
  organizationId: string
  projectId?: string
  chat?: ChatItem
}

interface DealStage {
  id: string
  name: string
  color: string
  order: number
  isClosed: boolean
}

interface DealResponse {
  id: string
  status: string
  windowOpen: boolean
  windowExpiresAt: string | null
  dealValue: string | null
  stage: DealStage
  assignee: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  tracking: {
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    sourceType: string | null
    ctwaclid: string | null
    referrerUrl: string | null
    landingPage: string | null
  } | null
  closedReason?: string | null
  closedAt?: string | null
  kpis: {
    messagesCount: number
    inboundMessagesCount: number
    outboundMessagesCount: number
    firstResponseTimeSec: number | null
    resolutionTimeSec: number | null
    createdAt: string
  }
  leadInsights: {
    totalDeals: number
    lifetimeValue: string
    firstMessageAt: string | null
  }
}

interface DealStagesResponse {
  items: DealStage[]
}

const STATUS_BADGE_MAP: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-amber-500/10', text: 'text-amber-700', label: 'Aberto' },
  closed_won: {
    bg: 'bg-green-500/10',
    text: 'text-green-700',
    label: 'Ganho',
  },
  closed_lost: { bg: 'bg-red-500/10', text: 'text-red-700', label: 'Perdido' },
}

function AccordionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className='inline-flex items-center gap-2'>
      <Icon className='h-3.5 w-3.5 text-muted-foreground' />
      {children}
    </span>
  )
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <span className='flex min-w-0 items-center gap-2 text-muted-foreground'>
        {Icon ? <Icon className='h-3.5 w-3.5 shrink-0' /> : null}
        <span className='truncate'>{label}</span>
      </span>
      <span className='min-w-0 truncate text-right font-medium'>{value}</span>
    </div>
  )
}

export function DealPanel({ conversationId, organizationId, projectId, chat }: DealPanelProps) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation-deal', conversationId, organizationId, projectId],
    queryFn: async () => {
      try {
        const data = await apiFetch(`/api/v1/conversations/${conversationId}/deal`, {
          orgId: organizationId,
          projectId,
        })
        return data as DealResponse
      } catch (err) {
        if (err instanceof Error && err.message.includes('404')) return null
        throw err
      }
    },
    staleTime: 30 * 1000,
    retry: 1,
  })

  const deal = data

  const { data: stagesData } = useQuery({
    queryKey: ['deal-stages', organizationId, projectId],
    queryFn: async () => {
      const data = await apiFetch(`/api/v1/deal-stages`, {
        orgId: organizationId,
        projectId,
      })
      return (data as DealStagesResponse) || { items: [] }
    },

    enabled: !!organizationId,
  })
  const stages = stagesData?.items || []

  const [optimisticDeal, addOptimisticDeal] = React.useOptimistic(
    deal,
    (state, newStageId: string) => {
      if (!state) return state
      const newStage = stages.find((stage) => stage.id === newStageId)
      return {
        ...state,
        stage: newStage ? { ...state.stage, ...newStage } : state.stage,
      }
    }
  )

  const handleUpdateStage = async (newStageId: string) => {
    try {
      if (!deal) return
      addOptimisticDeal(newStageId)

      const result = await updateDealStageAction({
        dealId: deal.id,
        stageId: newStageId,
        organizationId,
      })

      if (result.success) {
        toast.success('Etapa atualizada!')
        queryClient.invalidateQueries({ queryKey: ['conversation-deal', conversationId] })
      }
    } catch {
      toast.error('Erro ao mover deal')
    }
  }

  const formatDealValue = (value: number | string | null | undefined): string => {
    if (!value) return 'Sem valor'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value))
  }

  const formatTimer = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return '--'
    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const handleCopyPhone = async () => {
    if (!chat?.phone) return
    try {
      await navigator.clipboard.writeText(chat.phone)
      toast.success('Telefone copiado')
    } catch {
      toast.error('Não foi possível copiar o telefone')
    }
  }

  if (isLoading) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3 bg-card p-6'>
        <RefreshCw className='h-8 w-8 animate-spin text-primary/40' />
        <p className='font-medium text-muted-foreground text-sm'>Carregando detalhes...</p>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className='flex h-full flex-col items-center justify-center p-6 text-center'>
        <div className='mb-4 rounded-full bg-muted/50 p-4'>
          <ShieldAlert className='h-8 w-8 text-muted-foreground' />
        </div>
        <h3 className='mb-1 font-semibold text-lg'>Nenhum CRM Localizado</h3>
        <p className='text-muted-foreground text-sm'>
          As informações de negociação aparecerão aqui.
        </p>
      </div>
    )
  }

  const currentDeal = optimisticDeal ?? deal
  const statusBadge = STATUS_BADGE_MAP[currentDeal.status || 'open'] ?? STATUS_BADGE_MAP.open
  const quickSource = currentDeal.tracking?.sourceType === 'paid' ? 'Meta Ads' : 'Orgânico'
  const trackingRows = [
    { label: 'Origem', value: quickSource },
    { label: 'Campanha', value: currentDeal.tracking?.utmCampaign },
    { label: 'Conjunto', value: currentDeal.tracking?.utmMedium },
    { label: 'Anúncio', value: currentDeal.tracking?.utmSource },
    { label: 'Landing', value: currentDeal.tracking?.landingPage },
    { label: 'Referrer', value: currentDeal.tracking?.referrerUrl },
  ].filter((row) => row.value)

  return (
    <div className='flex h-full min-h-0 flex-col border-border/40 border-l bg-background'>
      <div className='custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden'>
        <div className='flex flex-col'>
          <Accordion
            type='multiple'
            defaultValue={['contact', 'opportunity']}
            className='w-full rounded-none border-0'
          >
            <AccordionItem value='contact' className='border-border/50 data-open:bg-transparent'>
              <AccordionTrigger className='py-3 font-semibold text-sm'>
                <AccordionTitle icon={User}>Contato</AccordionTitle>
              </AccordionTrigger>
              <AccordionContent className='space-y-3 pb-4'>
                <div className='space-y-1'>
                  <h2 className='font-semibold text-base'>{chat?.name || 'Lead'}</h2>
                  <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                    <Smartphone className='h-3.5 w-3.5' />
                    <span>{chat?.phone || 'Sem telefone'}</span>
                    <button
                      type='button'
                      className='text-muted-foreground transition-colors hover:text-foreground'
                      onClick={() => void handleCopyPhone()}
                    >
                      <Copy className='h-3.5 w-3.5' />
                    </button>
                  </div>
                </div>
                <div className='grid gap-2 rounded-md border border-border/50 bg-muted/20 p-3 text-sm'>
                  <InfoRow
                    label='Primeiro contato'
                    value={formatDate(currentDeal.leadInsights?.firstMessageAt)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value='opportunity'
              className='border-border/50 data-open:bg-transparent'
            >
              <AccordionTrigger className='py-3 font-semibold text-sm'>
                <AccordionTitle icon={CircleDot}>Oportunidade</AccordionTitle>
              </AccordionTrigger>
              <AccordionContent className='space-y-3 pb-4'>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] text-muted-foreground uppercase tracking-wider'>
                    Etapa do Funil
                  </Label>
                  <Select value={currentDeal.stage?.id || ''} onValueChange={handleUpdateStage}>
                    <SelectTrigger className='h-9 w-full border-border/50 bg-card shadow-sm'>
                      <SelectValue>
                        {currentDeal.stage ? (
                          <div className='flex items-center gap-2'>
                            <div
                              className='h-2 w-2 rounded-full'
                              style={{ backgroundColor: currentDeal.stage.color }}
                            />
                            <span className='font-medium text-sm'>{currentDeal.stage.name}</span>
                          </div>
                        ) : (
                          'Selecione...'
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className='flex items-center gap-2'>
                            <div
                              className='h-2 w-2 rounded-full'
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className='font-medium text-sm'>{stage.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2 rounded-md border border-border/50 bg-muted/20 p-3'>
                  <InfoRow
                    icon={CircleDot}
                    label='Status'
                    value={
                      <Badge className={`${statusBadge.bg} ${statusBadge.text} border-0`}>
                        {statusBadge.label}
                      </Badge>
                    }
                  />
                  <InfoRow
                    icon={User}
                    label='Responsável'
                    value={currentDeal.assignee?.name || 'Não atribuído'}
                  />
                  <InfoRow
                    icon={DollarSign}
                    label='Valor estimado'
                    value={formatDealValue(currentDeal.dealValue)}
                  />
                  {currentDeal.closedAt ? (
                    <InfoRow label='Fechamento' value={formatDate(currentDeal.closedAt)} />
                  ) : null}
                  {currentDeal.closedReason ? (
                    <InfoRow label='Motivo' value={currentDeal.closedReason} />
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='service' className='border-border/50 data-open:bg-transparent'>
              <AccordionTrigger className='py-3 font-semibold text-sm'>
                <AccordionTitle icon={MessageSquare}>Atendimento</AccordionTitle>
              </AccordionTrigger>
              <AccordionContent className='space-y-2 pb-4'>
                <div className='flex items-center justify-between rounded-md border border-border/50 bg-card px-3 py-2 text-sm'>
                  <span className='flex items-center gap-2 text-muted-foreground'>
                    <MessageSquare className='h-3.5 w-3.5' />
                    Mensagens
                  </span>
                  <span className='font-medium'>
                    <span className='inline-flex items-center gap-1 text-green-600'>
                      <ArrowUpRight className='h-3 w-3' />
                      {currentDeal.kpis.outboundMessagesCount} enviadas
                    </span>
                    {' / '}
                    <span className='inline-flex items-center gap-1 text-blue-600'>
                      <ArrowDownRight className='h-3 w-3' />
                      {currentDeal.kpis.inboundMessagesCount} recebidas
                    </span>
                  </span>
                </div>
                <div className='grid gap-2 rounded-md border border-border/50 bg-muted/20 p-3 text-sm'>
                  <InfoRow
                    icon={Timer}
                    label='Primeira resposta'
                    value={formatTimer(currentDeal.kpis.firstResponseTimeSec)}
                  />
                  <InfoRow
                    label='Resolução'
                    value={
                      currentDeal.kpis.resolutionTimeSec
                        ? formatTimer(currentDeal.kpis.resolutionTimeSec)
                        : 'Em aberto'
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value='traceability'
              className='border-border/50 data-open:bg-transparent'
            >
              <AccordionTrigger className='py-3 font-semibold text-sm'>
                <AccordionTitle icon={Megaphone}>Origem</AccordionTitle>
              </AccordionTrigger>
              <AccordionContent className='space-y-2 pb-4 text-sm'>
                <div className='grid gap-2 rounded-md border border-border/50 bg-muted/20 p-3'>
                  {trackingRows.map((row) => (
                    <InfoRow
                      key={row.label}
                      label={row.label}
                      value={<span className='truncate'>{row.value}</span>}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='history' className='border-border/50 data-open:bg-transparent'>
              <AccordionTrigger className='py-3 font-semibold text-sm'>
                <AccordionTitle icon={Timer}>Histórico do contato</AccordionTitle>
              </AccordionTrigger>
              <AccordionContent className='space-y-2 pb-4 text-sm'>
                <div className='grid gap-2 rounded-md border border-border/50 bg-muted/20 p-3'>
                  <InfoRow
                    label='Total de oportunidades'
                    value={currentDeal.leadInsights?.totalDeals ?? 0}
                  />
                  <InfoRow
                    label='LTV'
                    value={formatDealValue(currentDeal.leadInsights?.lifetimeValue)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='diagnostic' className='border-border/50 data-open:bg-transparent'>
              <AccordionTrigger className='py-3 font-semibold text-sm'>
                <AccordionTitle icon={Microscope}>Diagnóstico</AccordionTitle>
              </AccordionTrigger>
              <AccordionContent className='space-y-3 pb-4'>
                <div className='grid gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm'>
                  <InfoRow
                    icon={Route}
                    label='Janela WhatsApp'
                    value={currentDeal.windowOpen ? 'Aberta' : 'Fechada'}
                  />
                  {currentDeal.tracking?.ctwaclid ? (
                    <InfoRow label='ctwaclid' value={currentDeal.tracking.ctwaclid} />
                  ) : null}
                </div>
                <ConversationIntelligencePanel
                  conversationId={conversationId}
                  organizationId={organizationId}
                  projectId={projectId}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  )
}
