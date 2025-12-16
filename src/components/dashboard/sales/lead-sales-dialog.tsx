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
import { SalesList } from '@/components/dashboard/sales/sales-list'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import {
  leadSalesResponseSchema,
  type LeadSalesResponse,
} from '@/schemas/lead-tickets'

async function fetchLeadSales(leadId: string): Promise<LeadSalesResponse> {
  const response = await fetch(`/api/v1/leads/${leadId}/sales`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Não foi possível carregar as vendas do lead')
  }

  const json = await response.json()
  return leadSalesResponseSchema.parse(json)
}

export type LeadSalesDialogProps = {
  leadId: string
  leadName: string | null
  leadPhone: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadSalesDialog({
  leadId,
  leadName,
  leadPhone,
  open,
  onOpenChange,
}: LeadSalesDialogProps) {
  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ['lead-sales', leadId],
    queryFn: () => fetchLeadSales(leadId),
    enabled: open && Boolean(leadId),
    staleTime: 5_000,
    retry: 1,
  })

  const formattedPhone = useMemo(() => {
    return leadPhone ? applyWhatsAppMask(leadPhone) : '—'
  }, [leadPhone])

  const totalAmountLabel = data
    ? formatCurrencyBRL(data.totals.totalAmount)
    : isLoading
      ? 'Carregando…'
      : '—'

  const totalSalesLabel = data
    ? `${data.totals.sales} ${data.totals.sales === 1 ? 'venda' : 'vendas'}`
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full sm:max-w-none sm:w-[60vw] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:pr-8">
            <div>
              <DialogTitle>{leadName || 'Lead sem nome'}</DialogTitle>
              <DialogDescription>Telefone: {formattedPhone}</DialogDescription>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total em compras
              </p>
              <p className="text-lg font-semibold text-foreground">{totalAmountLabel}</p>
              {totalSalesLabel && (
                <p className="text-xs text-muted-foreground">{totalSalesLabel}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando vendas…
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
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Vendas</h3>
              <SalesList sales={data.sales} />
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
