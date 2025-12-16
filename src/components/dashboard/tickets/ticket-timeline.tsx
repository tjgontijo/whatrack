'use client'

import { ExternalLink } from 'lucide-react'

import { LeadTicket } from '@/schemas/lead-tickets'

type TicketTimelineProps = {
  items: LeadTicket[]
}

export function TicketTimeline({ items }: TicketTimelineProps) {
  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Nenhum ticket registrado para este lead.
      </div>
    )
  }

  return (
    <ol className="space-y-3">
      {items.map((ticket) => (
        <li key={ticket.id} className="rounded-md border bg-background p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {formatDateTime(ticket.createdAt)}
              </p>
              <div className="flex flex-wrap gap-2 text-xs pt-4">
                {renderTag('Origem', ticket.utmSource)}
                {renderTag('Meio', ticket.utmMedium)}
                {renderTag('Campanha', ticket.utmCampaign)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              {ticket.pipefyUrl && (
                <a
                  href={ticket.pipefyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
                >
                  Abrir no Pipefy
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>         
        </li>
      ))}
    </ol>
  )
}

function renderTag(label: string, value: string | null) {
  if (!value) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/10 px-2 py-1">
      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {status ?? 'Sem status'}
    </span>
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
