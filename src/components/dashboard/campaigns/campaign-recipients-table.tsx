'use client'

import * as React from 'react'
import { useState, useDeferredValue, useMemo } from 'react'
import { Search, Filter, Ban } from 'lucide-react'

import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type ColumnDef } from '@/components/dashboard/crud/types'

type CampaignRecipient = {
  id: string
  phone: string
  status: string
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedAt: string | null
  failureReason: string | null
  respondedAt: string | null
  exclusionReason: string | null
  metaWamid: string | null
  leadId: string | null
  dispatchGroupTemplateName: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  SENT: { label: 'Enviada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  DELIVERED: { label: 'Entregue', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  READ: { label: 'Lida', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  RESPONDED: { label: 'Interação', color: 'bg-green-50 text-green-700 border-green-200' },
  FAILED: { label: 'Falhou', color: 'bg-red-50 text-red-700 border-red-200' },
  EXCLUDED: { label: 'Excluído', color: 'bg-muted text-muted-foreground border-border' },
}

function P(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseFailureReason(reason: string | null) {
  if (!reason) return { code: null, message: null }
  const match = reason.match(/\(Meta\s+(\d+)\)\s*$/)
  if (!match) return { code: null, message: reason }
  return {
    code: match[1],
    message: reason.replace(/\s*\(Meta\s+\d+\)\s*$/, ''),
  }
}

export function CampaignRecipientsTable({ campaignId }: { campaignId: string }) {
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedFailureRecipient, setSelectedFailureRecipient] = useState<CampaignRecipient | null>(
    null
  )

  const deferredSearch = useDeferredValue(searchInput)

  const filters = useMemo(() => {
    const search = deferredSearch.trim()
    return {
      ...(search.length >= 2 ? { phone: search } : {}),
      ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    }
  }, [deferredSearch, statusFilter])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCrudInfiniteQuery<CampaignRecipient>({
      queryKey: ['campaign-recipients-infinite', campaignId],
      endpoint: `/api/v1/whatsapp/campaigns/${campaignId}/recipients`,
      pageSize: 40,
      filters,
    })

  const columns: ColumnDef<CampaignRecipient>[] = [
    {
      key: 'phone',
      label: 'Destinatário',
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[13px] font-semibold tracking-tight">{r.phone}</span>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 ${
                STATUS_MAP[r.status]?.color || 'bg-secondary'
              }`}
            >
              {STATUS_MAP[r.status]?.label || r.status}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'journey',
      label: 'Jornada',
      render: (r) => (
        <div className="flex items-center gap-3 w-[280px]">
          <div className="flex flex-col flex-1 gap-1">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">Envio</span>
            <span className="text-xs">{P(r.sentAt)}</span>
          </div>
          <div className="flex flex-col flex-1 gap-1">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">Lida</span>
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
              {P(r.readAt)}
            </span>
          </div>
          <div className="flex flex-col flex-1 gap-1">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">Resposta</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500">
              {P(r.respondedAt)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'errors',
      label: 'Intercorrências',
      render: (r) => {
        if (r.status === 'EXCLUDED') {
          return (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Ban className="h-3.5 w-3.5" />
              <span className="text-xs max-w-[150px] truncate" title={r.exclusionReason || ''}>
                {r.exclusionReason || 'Excluído'}
              </span>
            </div>
          )
        }
        if (r.failureReason || r.status === 'FAILED') {
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setSelectedFailureRecipient(r)}
            >
              Exibir Falha
            </Button>
          )
        }
        return <span className="text-muted-foreground/50 text-xs">—</span>
      },
    },
  ]

  const selectedFailure = selectedFailureRecipient
    ? parseFailureReason(selectedFailureRecipient.failureReason)
    : { code: null, message: null }

  return (
    <>
      <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden flex flex-col h-[600px]">
        <CardHeader className="border-b bg-card/50 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Audiência da Campanha</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Acompanhe o percurso de cada destinatário na Régua de Transmissão.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <Filter className="w-3.5 h-3.5 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">Todos</SelectItem>
                  {Object.entries(STATUS_MAP).map(([val, { label }]) => (
                    <SelectItem key={val} value={val} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar telefone..."
                  className="pl-9 h-9 w-[200px] text-xs"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <div className="flex-1 overflow-hidden relative">
          {isLoading && data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <span className="text-sm font-medium text-muted-foreground animate-pulse">Carregando dados da audiência...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <p className="text-sm font-medium text-muted-foreground">Nenhum destinatário encontrado.</p>
               <p className="text-xs text-muted-foreground mt-1">Experimente remover os filtros de busca.</p>
            </div>
          ) : (
            <CrudListView
              data={data}
              columns={columns}
              onEndReached={hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined}
            />
          )}
        </div>
      </Card>

      <Dialog
        open={Boolean(selectedFailureRecipient)}
        onOpenChange={(open) => {
          if (!open) setSelectedFailureRecipient(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mapeamento de Falha</DialogTitle>
            <DialogDescription>
              {selectedFailureRecipient
                ? `Destinatário: ${selectedFailureRecipient.phone}`
                : 'Detalhes da rejeição pela interface Meta Cloud.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
              <p className="text-red-800 text-xs font-semibold uppercase tracking-wider mb-2">
                Motivo da Rejeição
              </p>
              <p className="text-red-900 text-sm">{selectedFailure.message || 'Falha não especificada na camada webhook.'}</p>
            </div>
            {selectedFailure.code && (
              <div className="rounded-xl border p-4 bg-muted/30">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                  Meta Error Code
                </p>
                <p className="font-mono text-sm">{selectedFailure.code}</p>
              </div>
            )}
            {selectedFailureRecipient?.metaWamid && (
              <div className="rounded-xl border p-4 bg-muted/30">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                  Trace ID (WAMID)
                </p>
                <p className="font-mono text-xs break-all text-muted-foreground">{selectedFailureRecipient.metaWamid}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
