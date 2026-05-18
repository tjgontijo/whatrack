'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  DollarSign,
  Megaphone,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Timer,
  User,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/http/api-client'
import { updateDealStageAction } from '@/features/deals/actions/update-deal-stage-action'
import type { ChatItem } from './types'

interface DealPanelProps {
  conversationId: string
  organizationId: string
  projectId?: string
  chat?: ChatItem
}

interface DealResponse {
  id: string
  status: string
  windowOpen: boolean
  windowExpiresAt: string | null
  dealValue: string | null
  stage: {
    id: string
    name: string
    color: string
    order: number
    isClosed: boolean
  }
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
    totalTickets: number
    lifetimeValue: string
    firstMessageAt: string | null
  }
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
      return (data as any) || { items: [] }
    },

    enabled: !!organizationId,
  })
  const stages = stagesData?.items || []

  const [optimisticDeal, addOptimisticDeal] = React.useOptimistic(
    deal,
    (state, newStageId: string) => {
      if (!state) return state
      const newStage = stages.find((s: any) => s.id === newStageId)
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
        ticketId: deal.id,
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

  const calculateTimeRemaining = (expiresAt: Date) => {
    const now = new Date()
    const diffMs = expiresAt.getTime() - now.getTime()
    if (diffMs <= 0) return null
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return { hours, minutes, totalMinutes: Math.floor(diffMs / (1000 * 60)) }
  }

  const getWindowStatus = () => {
    if (!optimisticDeal?.windowExpiresAt) return null
    const expiresAt = new Date(optimisticDeal.windowExpiresAt)
    const timeRemaining = calculateTimeRemaining(expiresAt)

    if (!timeRemaining) {
      return {
        status: 'expired',
        expiresAt,
        timeRemaining: null,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
      }
    }

    const isWarning = timeRemaining.totalMinutes < 120
    return {
      status: 'open',
      expiresAt,
      timeRemaining,
      color: isWarning ? 'text-amber-600' : 'text-green-600',
      bgColor: isWarning ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200',
      isWarning,
    }
  }

  const formatTimer = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return '--'
    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
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

  const _statusBadge = STATUS_BADGE_MAP[optimisticDeal?.status || 'open']
  const _windowStatus = getWindowStatus()

  return (
    <div className='flex h-full min-h-0 flex-col border-border/40 border-l bg-background'>
      <div className='custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden'>
        <div className='flex flex-col space-y-6 p-6'>
          {/* Header do Lead */}
          <div className='flex flex-col items-center space-y-3 text-center'>
            <Avatar className='h-20 w-20 border-2 border-border/50 shadow-sm'>
              <AvatarImage src={chat?.profilePicUrl || undefined} />
              <AvatarFallback className='bg-primary/5 font-medium text-primary text-xl uppercase'>
                {chat?.name?.substring(0, 2) || 'LE'}
              </AvatarFallback>
            </Avatar>
            <div className='space-y-1'>
              <h2 className='font-bold text-xl tracking-tight'>{chat?.name || 'Lead'}</h2>
              <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                <Smartphone className='h-3.5 w-3.5' />
                <span className='text-sm'>{chat?.phone || 'Sem Telefone'}</span>
                <button className='text-muted-foreground transition-colors hover:text-foreground'>
                  <Copy className='h-3 w-3' />
                </button>
              </div>
            </div>
          </div>
          {/* Destaque: Tráfego Pago (Aha! Moment UX) */}
          {optimisticDeal?.tracking?.sourceType === 'paid' && (
            <div className='relative overflow-hidden rounded-xl border border-[#c13584]/20 bg-gradient-to-br from-[#c13584]/10 to-[#833ab4]/5 p-4'>
              <div className='absolute top-0 right-0 p-3 opacity-20'>
                <Megaphone className='h-12 w-12 text-[#c13584]' />
              </div>
              <div className='relative z-10'>
                <div className='mb-2 flex items-center gap-2'>
                  <Badge className='border-0 bg-[#c13584] font-bold text-[10px] text-white uppercase tracking-wider hover:bg-[#c13584]/90'>
                    ✨ Meta Ads
                  </Badge>
                  <span className='font-medium text-[#c13584] text-xs'>Lead pago via clique</span>
                </div>
                {optimisticDeal.tracking?.utmCampaign && (
                  <p className='mb-1 font-semibold text-foreground text-sm'>
                    Campanha: {optimisticDeal.tracking.utmCampaign}
                  </p>
                )}
                {optimisticDeal.tracking?.ctwaclid && (
                  <p
                    className='max-w-[200px] truncate font-mono text-[10px] text-muted-foreground/80'
                    title={optimisticDeal.tracking.ctwaclid}
                  >
                    ID: {optimisticDeal.tracking.ctwaclid}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* CRM Interno */}
          <div className='space-y-4 pt-2'>
            <h3 className='font-bold text-muted-foreground text-xs uppercase tracking-wider'>
              Oportunidade
            </h3>
            <div className='grid gap-3'>
              {/* Seletor de Etapas (Stages) */}
              <div className='flex flex-col gap-1.5'>
                <Label className='font-bold text-[10px] text-muted-foreground uppercase tracking-wider'>
                  Etapa do Funil
                </Label>
                <Select
                  value={optimisticDeal?.stage?.id || ''}
                  onValueChange={handleUpdateStage}
                >
                  <SelectTrigger className='h-9 w-full border-border/50 bg-card shadow-sm'>
                    <SelectValue>
                      {optimisticDeal?.stage ? (
                        <div className='flex items-center gap-2'>
                          <div
                            className='h-2 w-2 rounded-full'
                            style={{ backgroundColor: optimisticDeal.stage.color }}
                          />
                          <span className='font-medium text-sm'>{optimisticDeal.stage.name}</span>
                        </div>
                      ) : (
                        'Selecione...'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage: any) => (
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

              {/* Responsável */}
              <div className='flex flex-col gap-1.5 border-border/40 border-t pt-3'>
                <Label className='font-bold text-[10px] text-muted-foreground uppercase tracking-wider'>
                  Responsável
                </Label>
                <div className='flex items-center rounded-md border border-border/50 bg-muted/20 px-3 py-2'>
                  <User className='mr-2 h-4 w-4 text-muted-foreground' />
                  <span className='text-foreground/90 text-sm'>
                    {optimisticDeal?.assignee?.name || 'Não atribuído'}
                  </span>
                </div>
              </div>

              {/* Valor Estimado */}
              <div className='flex flex-col gap-1.5'>
                <Label className='font-bold text-[10px] text-muted-foreground uppercase tracking-wider'>
                  Valor Estimado
                </Label>
                <div className='flex items-center rounded-md border border-border/50 bg-muted/20 px-3 py-2'>
                  <DollarSign className='mr-2 h-4 w-4 text-green-600/70' />
                  <span className='font-semibold text-foreground/90 text-sm'>
                    {formatDealValue(optimisticDeal?.dealValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dossiê & KPIs do Atendimento */}
          {optimisticDeal?.kpis && (
            <div className='pt-2'>
              <h3 className='mb-3 font-bold text-muted-foreground text-xs uppercase tracking-wider'>
                Dossiê do Atendimento
              </h3>
              <div className='grid grid-cols-2 gap-2'>
                {/* Contagem de Mensagens (Vendedor x Lead) */}
                <div className='col-span-2 flex items-center justify-between rounded-lg border border-border/50 bg-card p-3'>
                  <div className='flex items-center gap-2'>
                    <MessageSquare className='h-4 w-4 text-primary/70' />
                    <span className='font-medium text-muted-foreground text-xs'>
                      Volume da Conversa
                    </span>
                  </div>
                  <div className='flex items-center gap-3 font-bold text-xs'>
                    <span
                      className='flex items-center gap-1 text-green-600'
                      title='Mensagens da Clínica'
                    >
                      <ArrowUpRight className='h-3 w-3' />{' '}
                      {optimisticDeal.kpis.outboundMessagesCount}
                    </span>
                    <span className='text-border'>|</span>
                    <span
                      className='flex items-center gap-1 text-blue-600'
                      title='Mensagens do Cliente'
                    >
                      <ArrowDownRight className='h-3 w-3' />{' '}
                      {optimisticDeal.kpis.inboundMessagesCount}
                    </span>
                  </div>
                </div>

                {/* Tempo 1a Resposta */}
                <div className='col-span-1 flex flex-col gap-1 rounded-lg border border-border/40 bg-muted/10 p-3'>
                  <div className='mb-1 flex items-center gap-1.5 text-muted-foreground'>
                    <Timer className='h-3.5 w-3.5' />
                    <span className='font-bold text-[10px] uppercase tracking-wider'>
                      1ª Resposta
                    </span>
                  </div>
                  <span className='font-bold text-foreground text-sm'>
                    {formatTimer(optimisticDeal.kpis.firstResponseTimeSec)}
                  </span>
                </div>

                {/* Tempo de Resolução */}
                <div className='col-span-1 flex flex-col gap-1 rounded-lg border border-border/40 bg-muted/10 p-3'>
                  <div className='mb-1 flex items-center gap-1.5 text-muted-foreground'>
                    <Activity className='h-3.5 w-3.5' />
                    <span className='font-bold text-[10px] uppercase tracking-wider'>
                      Resolução
                    </span>
                  </div>
                  <span className='font-bold text-foreground text-sm'>
                    {formatTimer(optimisticDeal.kpis.resolutionTimeSec)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Histórico do Lead / LTV */}
          {optimisticDeal?.leadInsights && (
            <div className='pt-2'>
              <h3 className='mb-3 font-bold text-muted-foreground text-xs uppercase tracking-wider'>
                Histórico do Cliente
              </h3>
              <div className='flex flex-col gap-2'>
                <div className='flex items-center justify-between rounded-lg border border-border/50 bg-card p-3'>
                  <div className='flex items-center gap-2'>
                    <User className='h-4 w-4 text-primary/70' />
                    <span className='font-medium text-muted-foreground text-xs'>
                      Oportunidades Iniciais
                    </span>
                  </div>
                  <span className='font-bold text-xs'>
                    {optimisticDeal.leadInsights.totalTickets} deals
                  </span>
                </div>
                <div className='flex items-center justify-between rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent p-3'>
                  <div className='flex items-center gap-2'>
                    <DollarSign className='h-4 w-4 text-emerald-600' />
                    <span className='font-medium text-muted-foreground text-xs'>
                      Valor Gerado (LTV)
                    </span>
                  </div>
                  <span className='font-bold text-emerald-600 text-sm'>
                    {formatDealValue(optimisticDeal.leadInsights.lifetimeValue)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
