'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock3, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { apiFetch } from '@/lib/api-client'
import { formatDate } from '@/lib/date/format-date'
import type { BillingPlanHistoryResponse } from '@/schemas/billing/billing-plan-schemas'

type BillingPlanHistorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string | null
  planName?: string
}

export function BillingPlanHistorySheet({
  open,
  onOpenChange,
  planId,
  planName,
}: BillingPlanHistorySheetProps) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!open) {
      setPage(1)
    }
  }, [open])

  const historyQuery = useQuery<BillingPlanHistoryResponse>({
    queryKey: ['billing-plan-history', planId, page],
    enabled: open && Boolean(planId),
    queryFn: () =>
      apiFetch(`/api/v1/system/billing-plans/${planId}/history?page=${page}&pageSize=10`),
  })

  const items = historyQuery.data?.items ?? []
  const totalPages = historyQuery.data?.totalPages ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(96vw,760px)] sm:max-w-none">
        <SheetHeader className="border-b">
          <SheetTitle>Histórico do plano</SheetTitle>
          <SheetDescription>
            {planName ? `Auditoria recente de ${planName}.` : 'Auditoria recente do plano.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {historyQuery.isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center gap-3">
                <RefreshCw className="text-primary h-5 w-5 animate-spin" />
                <p className="text-muted-foreground text-sm">Carregando histórico...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border">
                <Clock3 className="text-muted-foreground h-6 w-6" />
                <p className="text-muted-foreground text-sm">
                  Nenhuma entrada de auditoria encontrada para este plano.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="space-y-3 rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.action}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {item.user?.name || item.user?.email || 'Sistema'}
                    </p>
                  </div>

                  {item.metadata ? (
                    <pre className="bg-muted overflow-x-auto rounded-xl p-3 text-xs">
                      {JSON.stringify(item.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t p-6">
              <Button
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1 || historyQuery.isLoading}
              >
                Anterior
              </Button>
              <span className="text-muted-foreground text-sm">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || historyQuery.isLoading}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
