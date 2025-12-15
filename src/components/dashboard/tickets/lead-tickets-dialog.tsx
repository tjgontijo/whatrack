'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TicketTimeline } from '@/components/dashboard/tickets/ticket-timeline'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'
import {
  LeadTicketsResponse,
  leadTicketsResponseSchema,
} from '@/lib/schema/lead-tickets'

async function fetchLeadTickets(leadId: string): Promise<LeadTicketsResponse> {
  const response = await fetch(`/api/v1/leads/${leadId}/tickets`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Não foi possível carregar os tickets do lead')
  }

  const json = await response.json()
  return leadTicketsResponseSchema.parse(json)
}

export type LeadTicketsDialogProps = {
  leadId: string
  leadName: string | null
  leadPhone: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadTicketsDialog({
  leadId,
  leadName,
  leadPhone,
  open,
  onOpenChange,
}: LeadTicketsDialogProps) {
  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ['lead-tickets', leadId],
    queryFn: () => fetchLeadTickets(leadId),
    enabled: open && Boolean(leadId),
    staleTime: 5_000,
    retry: 1,
  })

  const formattedPhone = useMemo(() => {
    return leadPhone ? applyWhatsAppMask(leadPhone) : '—'
  }, [leadPhone])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full sm:max-w-none sm:w-[60vw] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>
            {leadName || 'Lead sem nome'}
          </DialogTitle>
          <DialogDescription>
            Telefone: {formattedPhone}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando tickets…
          </div>
        )}

        {isError && !isLoading && (
          <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            <p>{(error as Error | undefined)?.message ?? 'Erro ao carregar dados.'}</p>
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
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {data.totals.tickets}
              </span>{' '}
              {data.totals.tickets === 1
                ? 'ticket registrado para este lead.'
                : 'tickets registrados para este lead.'}
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Tickets</h3>
              <TicketTimeline items={data.tickets} />
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
