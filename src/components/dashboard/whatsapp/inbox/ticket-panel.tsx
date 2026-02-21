'use client'

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, Clock, User, DollarSign, Link as LinkIcon, AlertTriangle, Copy, Sparkles, Check, X, Megaphone, Smartphone, UserMinus, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChatItem } from './types'

interface TicketPanelProps {
  conversationId: string
  organizationId: string
  chat?: ChatItem
}

interface TicketResponse {
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

export function TicketPanel({
  conversationId,
  organizationId,
  chat,
}: TicketPanelProps) {
  const [showAiApproval, setShowAiApproval] = useState(true)
  const queryClient = useQueryClient()



  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation-ticket', conversationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/ticket`
      )
      if (response.status === 404) return null
      if (!response.ok) throw new Error('Failed to fetch ticket')
      return response.json() as Promise<TicketResponse>
    },
    staleTime: 30 * 1000,
    retry: 1,
  })

  const ticket = data

  // Use the same tickets data, or fetch the ai_approval directly
  const { data: approvalsData } = useQuery({
    queryKey: ['ai-approvals', ticket?.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/ai-approvals?status=PENDING`)
      if (!res.ok) return { items: [] }
      return res.json()
    },
    enabled: !!ticket?.id
  })

  const currentApproval = approvalsData?.items?.find((a: any) => a.ticketId === ticket?.id)

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
    if (!ticket?.windowExpiresAt) return null
    const expiresAt = new Date(ticket.windowExpiresAt)
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

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6 bg-card">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-muted/50 p-4 rounded-full mb-4">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Nenhum CRM Localizado</h3>
        <p className="text-sm text-muted-foreground">
          As informações de negociação aparecerão aqui.
        </p>
      </div>
    )
  }

  const statusBadge = STATUS_BADGE_MAP[ticket.status]
  const windowStatus = getWindowStatus()

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/40">
      <ScrollArea className="flex-1">
        <div className="flex flex-col p-6 space-y-6">

          {/* Header do Lead */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="h-20 w-20 border-2 border-border/50 shadow-sm">
              <AvatarImage src={chat?.profilePicUrl || undefined} />
              <AvatarFallback className="bg-primary/5 text-primary text-xl font-medium uppercase">
                {chat?.name?.substring(0, 2) || 'LE'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">{chat?.name || 'Lead'}</h2>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5" />
                <span className="text-sm">{chat?.phone || 'Sem Telefone'}</span>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            {statusBadge && (
              <Badge variant="outline" className={`${statusBadge.bg} ${statusBadge.text} px-3 py-1 text-xs border-0 font-medium`}>
                Oportunidade {statusBadge.label} (ID: #{ticket.id.slice(0, 6)})
              </Badge>
            )}
          </div>

          {/* Destaque: Tráfego Pago (Aha! Moment UX) */}
          {ticket.tracking?.sourceType === 'paid' && (
            <div className="relative overflow-hidden rounded-xl border border-[#c13584]/20 bg-gradient-to-br from-[#c13584]/10 to-[#833ab4]/5 p-4">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <Megaphone className="h-12 w-12 text-[#c13584]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-[#c13584] text-white hover:bg-[#c13584]/90 border-0 text-[10px] uppercase font-bold tracking-wider">
                    ✨ Meta Ads
                  </Badge>
                  <span className="text-xs font-medium text-[#c13584]">Lead pago via clique</span>
                </div>
                {ticket.tracking.utmCampaign && (
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Campanha: {ticket.tracking.utmCampaign}
                  </p>
                )}
                {ticket.tracking.ctwaclid && (
                  <p className="text-[10px] text-muted-foreground/80 font-mono truncate max-w-[200px]" title={ticket.tracking.ctwaclid}>
                    ID: {ticket.tracking.ctwaclid}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Destaque: Copilot IA (Mastra) */}
          {ticket.status === 'open' && currentApproval && showAiApproval && (
            <div className="relative rounded-xl border-2 border-primary/20 bg-primary/5 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-primary/20 rounded-full">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <span className="text-sm font-bold text-primary">IA Detectou Fechamento!</span>
                <Badge className="ml-auto bg-green-100 text-green-800 text-[10px] hover:bg-green-100 uppercase">
                  {(currentApproval.confidence * 100).toFixed(0)}% de Precisão
                </Badge>
              </div>
              <div className="bg-background/80 rounded border border-border/50 p-3 mb-3 text-sm">
                <p className="text-muted-foreground break-words leading-relaxed text-xs mb-2">
                  "{currentApproval.reasoning}"
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded border">
                  <span className="font-medium text-xs truncate mr-2" title={currentApproval.productName}>{currentApproval.productName || 'Não especificado'}</span>
                  <span className="font-bold text-green-600 text-sm whitespace-nowrap">{formatDealValue(currentApproval.dealValue)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/90 text-xs"
                  onClick={async () => {
                    const loadingToast = toast.loading('Aprovando venda...')
                    try {
                      const res = await fetch(`/api/v1/ai-approvals/${currentApproval.id}/approve`, { method: 'PATCH' })
                      if (!res.ok) throw new Error()
                      toast.success('Venda concluída com IA no CAPI!', { id: loadingToast })
                      setShowAiApproval(false)
                      queryClient.invalidateQueries({ queryKey: ['conversation-ticket', conversationId] })
                      queryClient.invalidateQueries({ queryKey: ['ai-approvals'] })
                    } catch {
                      toast.error('Erro ao aprovar.', { id: loadingToast })
                    }
                  }}
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Aprovar Venda (CAPI)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-3"
                  onClick={async () => {
                    try {
                      await fetch(`/api/v1/ai-approvals/${currentApproval.id}/reject`, { method: 'PATCH' })
                      toast.info('Sugestão rejeitada.')
                      setShowAiApproval(false)
                      queryClient.invalidateQueries({ queryKey: ['ai-approvals'] })
                    } catch { }
                  }}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          )}

          {/* CRM Interno */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gestão do CRM</h3>

            <div className="grid gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Estágio do Funil</Label>
                <Select defaultValue={ticket.stage.id}>
                  <SelectTrigger className="h-9 w-full bg-card shadow-sm border-border/50">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ticket.stage.color }} />
                        <span className="text-sm font-medium">{ticket.stage.name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ticket.stage.id}>{ticket.stage.name}</SelectItem>
                    {/* Map real stages here later */}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Proprietário (Responsável)</Label>
                <Select defaultValue={ticket.assignee?.id || 'unassigned'}>
                  <SelectTrigger className="h-9 w-full bg-card shadow-sm border-border/50">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {ticket.assignee ? (
                          <>
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={ticket.assignee.image || undefined} />
                              <AvatarFallback className="text-[10px]">{ticket.assignee.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{ticket.assignee.name}</span>
                          </>
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Não Atribuído</span>
                          </>
                        )}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ticket.assignee && (
                      <SelectItem value={ticket.assignee.id}>{ticket.assignee.name}</SelectItem>
                    )}
                    <SelectItem value="unassigned">Não Atribuído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-border/40 pt-3">
                <Label className="text-xs text-muted-foreground">Valor Estimado</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 bg-muted/20">
                  <DollarSign className="h-4 w-4 text-green-600/70" />
                  <span className="text-sm font-semibold text-foreground/90">
                    {formatDealValue(ticket.dealValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Window Tracker */}
          {windowStatus && (
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">SLA & WhatsApp</h3>
              {windowStatus.status === 'expired' ? (
                <div className={`flex items-center gap-3 px-3 py-3 rounded-lg border ${windowStatus.bgColor}`}>
                  <AlertTriangle className={`h-5 w-5 ${windowStatus.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${windowStatus.color}`}>Janela Encerrada</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Envie um template.</p>
                  </div>
                </div>
              ) : (
                <div className={`space-y-2 px-3 py-3 rounded-lg border ${windowStatus.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-4 w-4 ${windowStatus.color}`} />
                      <span className={`text-sm font-bold tracking-tight ${windowStatus.color}`}>
                        {windowStatus.timeRemaining?.hours}h {windowStatus.timeRemaining?.minutes}m
                      </span>
                    </div>
                    {windowStatus.isWarning && (
                      <Badge className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 border-0 text-[10px] px-1.5">
                        ALERTA
                      </Badge>
                    )}
                  </div>
                  <div className="w-full bg-background/50 rounded-full h-1.5 overflow-hidden border border-border/20">
                    <div
                      className={`h-full rounded-full transition-all ${windowStatus.isWarning ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                      style={{
                        width: `${Math.min(100, (windowStatus.timeRemaining!.totalMinutes / 1440) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </ScrollArea>

      {/* Footer Fixo: CTAs Principais */}
      {ticket.status === 'open' && (
        <div className="p-4 bg-card border-t border-border/60 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10 space-y-2 relative">
          <Button className="w-full font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm h-10">
            ✅ Concluir Negócio (CAPI)
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-red-600 h-8">
            Descartar Oportunidade
          </Button>
        </div>
      )}
    </div>
  )
}
