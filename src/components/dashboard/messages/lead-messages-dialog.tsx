'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'
import {
  leadMessagesResponseSchema,
  type LeadMessagesResponse,
  type LeadMessage,
} from '@/lib/schema/lead-messages'
import { cn } from '@/lib/utils'
import { Virtuoso } from 'react-virtuoso'

async function fetchLeadMessages(leadId: string): Promise<LeadMessagesResponse> {
  const response = await fetch(`/api/v1/leads/${leadId}/messages`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Não foi possível carregar as mensagens do lead')
  }

  const json = await response.json()
  return leadMessagesResponseSchema.parse(json)
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(date)
}

function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function groupMessagesByDay(messages: LeadMessage[]) {
  const map = new Map<string, { label: string; items: LeadMessage[] }>()

  for (const message of messages) {
    const sentAt = message.sent_at ? new Date(message.sent_at) : undefined
    const key = sentAt ? sentAt.toDateString() : 'sem-data'

    if (!map.has(key)) {
      map.set(key, {
        label: sentAt ? formatDayLabel(sentAt) : 'Data desconhecida',
        items: [],
      })
    }

    map.get(key)?.items.push(message)
  }

  return Array.from(map.entries())
    .sort(([aKey], [bKey]) => {
      if (aKey === 'sem-data') return 1
      if (bKey === 'sem-data') return -1
      return new Date(aKey).getTime() - new Date(bKey).getTime()
    })
    .map(([, value]) => ({
      label: value.label,
      items: value.items,
    }))
}

function getMessageAlignment(role: LeadMessage['author']['role']) {
  if (role === 'lead') {
    return {
      container: 'items-start text-left',
      bubble: 'bg-muted text-foreground border border-border/60',
    }
  }

  if (role === 'bot') {
    return {
      container: 'items-center text-center',
      bubble: 'bg-secondary text-secondary-foreground border border-secondary/40',
    }
  }

  // team default
  return {
    container: 'items-end text-right',
    bubble: 'bg-primary text-primary-foreground shadow-sm',
  }
}

export type LeadMessagesDialogProps = {
  leadId: string
  leadName: string | null
  leadPhone: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadMessagesDialog({
  leadId,
  leadName,
  leadPhone,
  open,
  onOpenChange,
}: LeadMessagesDialogProps) {
  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ['lead-messages', leadId],
    queryFn: () => fetchLeadMessages(leadId),
    enabled: open && Boolean(leadId),
    staleTime: 10_000,
    retry: 1,
  })

  const formattedPhone = React.useMemo(() => {
    return leadPhone ? applyWhatsAppMask(leadPhone) : '—'
  }, [leadPhone])

  const groupedMessages = React.useMemo(() => {
    if (!data?.messages?.length) return []
    return groupMessagesByDay(data.messages)
  }, [data?.messages])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-h-[60vh] w-full sm:max-w-none sm:w-[60vw] overflow-y-auto p-6">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b bg-muted/50 px-0 pb-4">
            <DialogTitle className="text-lg font-semibold">
              {leadName || 'Lead sem nome'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Telefone: {formattedPhone}
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex flex-1 items-center justify-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando mensagens…
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-destructive">
              <p>{(error as Error | undefined)?.message ?? 'Erro ao carregar mensagens.'}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm font-medium underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoading && !isError && data && (
            <div className="flex flex-1 min-h-0 flex-col">
              {groupedMessages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                  Nenhuma mensagem encontrada para este lead.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto py-6">
                  <div className="mx-auto w-full max-w-3xl">
                    <Virtuoso
                      totalCount={groupedMessages.reduce((acc, g) => acc + 1 + g.items.length, 0)}
                      itemContent={(index) => {
                        let cursor = index
                        for (const group of groupedMessages) {
                          if (cursor === 0) {
                            return (
                              <div className="my-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {group.label}
                              </div>
                            )
                          }
                          cursor--
                          if (cursor < group.items.length) {
                            const message = group.items[cursor]
                            const sentAt = message.sent_at ? new Date(message.sent_at) : undefined
                            const timeLabel = sentAt ? formatTimeLabel(sentAt) : 'Horário desconhecido'
                            const body = message.body?.trim() || 'Mensagem vazia'
                            const alignment = getMessageAlignment(message.author.role)
                            return (
                              <div
                                key={message.id}
                                className={cn(
                                  'flex flex-col gap-1',
                                  message.author.role === 'lead'
                                    ? 'items-start'
                                    : message.author.role === 'bot'
                                    ? 'items-center'
                                    : 'items-end'
                                )}
                              >
                                <div className={cn('max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm', alignment.bubble)}>
                                  <p className="whitespace-pre-wrap break-words leading-relaxed">{body}</p>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {timeLabel}
                                  {message.author.number ? ` · ${message.author.number}` : null}
                                </div>
                              </div>
                            )
                          }
                          cursor -= group.items.length
                        }
                        return null
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
