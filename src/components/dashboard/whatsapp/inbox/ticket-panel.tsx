'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, Clock, User, DollarSign, Link as LinkIcon, AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface TicketPanelProps {
  conversationId: string
  organizationId: string
}

interface Ticket {
  id: string
  status: string
  windowOpen: boolean
  windowExpiresAt: string | null
  dealValue: number | null
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

/**
 * Ticket Panel Component
 *
 * Displays ticket information for the selected conversation including:
 * - Ticket stage with color badge
 * - Assignee information
 * - Deal value
 * - Window status (24h indicator)
 * - Tracking information (UTM params, Click IDs)
 * - Action buttons to change stage, assign, or close
 */
export function TicketPanel({
  conversationId,
  organizationId,
}: TicketPanelProps) {
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [closeReason, setCloseReason] = useState<'won' | 'lost'>('won')

  // Fetch ticket for the conversation
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation-ticket', conversationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/ticket`
      )
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error('Failed to fetch ticket')
      }
      return response.json() as Promise<TicketResponse>
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  })

  const ticket = data as Ticket | null | undefined

  // Helper function to format deal value
  const formatDealValue = (value: number | null | undefined): string => {
    if (!value) return 'Sem valor'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Helper function to calculate remaining time
  const calculateTimeRemaining = (expiresAt: Date) => {
    const now = new Date()
    const diffMs = expiresAt.getTime() - now.getTime()

    if (diffMs <= 0) return null

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    return { hours, minutes, totalMinutes: Math.floor(diffMs / (1000 * 60)) }
  }

  // Helper function to get window status
  const getWindowStatus = () => {
    if (!ticket?.windowExpiresAt) return null

    const expiresAt = new Date(ticket.windowExpiresAt)
    const now = new Date()
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

    // Warn if less than 2 hours remaining
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
      <div className="h-full flex flex-col p-4 bg-card">
        <Skeleton className="h-8 w-32 mb-4" />
        <Separator className="mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col p-4 bg-card">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Erro ao carregar ticket</span>
        </div>
      </div>
    )
  }

  // No ticket found
  if (!ticket) {
    return (
      <div className="h-full flex flex-col p-4 bg-card">
        <h3 className="font-semibold text-sm mb-2">Informações do Ticket</h3>
        <Separator className="mb-4" />
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum ticket aberto para esta conversa
          </p>
        </div>
      </div>
    )
  }

  const statusBadge = STATUS_BADGE_MAP[ticket.status]
  const windowStatus = getWindowStatus()

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Informações do Ticket</h3>
          <Badge variant="outline" className="text-xs">
            #{ticket.id.slice(0, 8)}
          </Badge>
        </div>

        <Separator />

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge className={`${statusBadge.bg} ${statusBadge.text}`}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Stage Section */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Estágio
          </Label>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md border"
            style={{
              borderLeftColor: ticket.stage.color,
              borderLeftWidth: '3px',
            }}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{ticket.stage.name}</p>
              <p className="text-xs text-muted-foreground">
                {ticket.stage.order}/{5}
              </p>
            </div>
          </div>
        </div>

        {/* Assignee Section */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Atribuído a
          </Label>
          {ticket.assignee ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
              {ticket.assignee.image && (
                <img
                  src={ticket.assignee.image}
                  alt={ticket.assignee.name || ''}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {ticket.assignee.name || 'Sem nome'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {ticket.assignee.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm">Não atribuído</span>
            </div>
          )}
        </div>

        {/* Deal Value Section */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Valor do negócio
          </Label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatDealValue(ticket.dealValue as unknown as number)}
            </span>
          </div>
        </div>

        {/* Window Status */}
        {windowStatus && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              Janela de resposta (24h)
            </Label>
            {windowStatus.status === 'expired' ? (
              <div className={`flex items-center gap-2 px-3 py-3 rounded-md border ${windowStatus.bgColor}`}>
                <AlertTriangle className={`h-4 w-4 ${windowStatus.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${windowStatus.color}`}>
                    Janela fechada
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fechada em {format(windowStatus.expiresAt, "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ) : (
              <div className={`space-y-2 px-3 py-3 rounded-md border ${windowStatus.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${windowStatus.color}`} />
                    <span className={`text-sm font-semibold ${windowStatus.color}`}>
                      {windowStatus.timeRemaining?.hours}h {windowStatus.timeRemaining?.minutes}min
                    </span>
                  </div>
                  {windowStatus.isWarning && (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-700">
                      Atenção
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      windowStatus.isWarning ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (windowStatus.timeRemaining!.totalMinutes / 1440) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Encerra em</span>
                  <span className="font-semibold">
                    {format(windowStatus.expiresAt, "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tracking Section */}
        {ticket.tracking && (
          <>
            <Separator className="my-2" />
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                Rastreamento
              </Label>

              {/* UTM Parameters */}
              {(ticket.tracking.utmSource ||
                ticket.tracking.utmMedium ||
                ticket.tracking.utmCampaign) && (
                <div className="bg-muted/50 rounded-md p-3 space-y-1">
                  {ticket.tracking.utmSource && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Origem: </span>
                      <span className="font-medium">
                        {ticket.tracking.utmSource}
                      </span>
                    </div>
                  )}
                  {ticket.tracking.utmMedium && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Meio: </span>
                      <span className="font-medium">
                        {ticket.tracking.utmMedium}
                      </span>
                    </div>
                  )}
                  {ticket.tracking.utmCampaign && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Campanha: </span>
                      <span className="font-medium">
                        {ticket.tracking.utmCampaign}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Click IDs */}
              {ticket.tracking.ctwaclid && (
                <div className="text-xs bg-muted/50 rounded-md p-2">
                  <span className="text-muted-foreground">Click ID: </span>
                  <span className="font-mono text-xs truncate">
                    {ticket.tracking.ctwaclid}
                  </span>
                </div>
              )}

              {/* Referrer */}
              {ticket.tracking.referrerUrl && (
                <div className="flex items-start gap-2 bg-muted/50 rounded-md p-2">
                  <LinkIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <a
                    href={ticket.tracking.referrerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate"
                  >
                    {ticket.tracking.referrerUrl}
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-4 border-t">
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setCloseReason('won')
              setShowCloseDialog(true)
            }}
            disabled={ticket.status !== 'open'}
          >
            Fechar como Ganho
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setCloseReason('lost')
              setShowCloseDialog(true)
            }}
            disabled={ticket.status !== 'open'}
          >
            Fechar como Perdido
          </Button>
        </div>

        {/* Close Dialog */}
        <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <AlertDialogContent>
            <AlertDialogTitle>
              Fechar ticket como{' '}
              {closeReason === 'won' ? 'Ganho' : 'Perdido'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O ticket será marcado como
              finalizado.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction>
                Confirmar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  )
}
