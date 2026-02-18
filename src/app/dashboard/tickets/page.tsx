'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ticket, User, Calendar, MessageSquare, DollarSign, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { CrudPageShell } from '@/components/dashboard/crud/crud-page-shell'
import { CrudDataView } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { CrudKanbanView } from '@/components/dashboard/crud/crud-kanban-view'
import { useCrudInfiniteQuery } from '@/hooks/use-crud-infinite-query'
import { type ColumnDef, type CardConfig, type KanbanColumn, type ViewType } from '@/components/dashboard/crud/types'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { formatCurrencyBRL } from '@/lib/mask/formatters'

type TicketItem = {
  id: string
  lead: {
    id: string
    name: string | null
    phone: string | null
    pushName: string | null
  }
  stage: {
    id: string
    name: string
    color: string
  }
  assignee: { id: string; name: string } | null
  status: string
  windowOpen: boolean
  dealValue: number | null
  messagesCount: number
  salesCount: number
  createdAt: string
  lastMessageAt: string | null
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'open', label: 'Abertos' },
  { value: 'closed_won', label: 'Ganhos' },
  { value: 'closed_lost', label: 'Perdidos' },
]

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Aberto', variant: 'default' },
  closed_won: { label: 'Ganho', variant: 'secondary' },
  closed_lost: { label: 'Perdido', variant: 'destructive' },
}

const DATE_OPTIONS = [
  { value: 'all', label: 'Todas as datas' },
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
]

const getLeadName = (ticket: TicketItem) =>
  ticket.lead.name || ticket.lead.pushName || ticket.lead.phone || 'Sem nome'

const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

const daysSince = (date: string) => {
  const diff = Date.now() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const columns: ColumnDef<TicketItem>[] = [
  {
    key: 'lead',
    label: 'Lead',
    render: (ticket) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="h-7 w-7 border border-border/50 shrink-0">
          <AvatarFallback className="text-[9px] bg-primary/5 text-primary font-semibold">
            {getInitials(getLeadName(ticket))}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-[13px] truncate">{getLeadName(ticket)}</span>
      </div>
    ),
  },
  {
    key: 'stage',
    label: 'Fase',
    width: 160,
    render: (ticket) => (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ticket.stage.color }} />
        <span className="text-sm">{ticket.stage.name}</span>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: 110,
    render: (ticket) => {
      const s = STATUS_BADGE[ticket.status]
      return s ? <Badge variant={s.variant}>{s.label}</Badge> : <span className="text-muted-foreground">—</span>
    },
  },
  {
    key: 'dealValue',
    label: 'Valor',
    width: 120,
    render: (ticket) => (
      <span className="font-semibold text-emerald-600">
        {ticket.dealValue ? formatCurrencyBRL(ticket.dealValue) : <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    key: 'assignee',
    label: 'Responsável',
    width: 140,
    render: (ticket) => ticket.assignee ? (
      <span className="text-sm text-muted-foreground">{ticket.assignee.name}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    ),
  },
  {
    key: 'createdAt',
    label: 'Criado há',
    width: 100,
    headerClassName: 'text-right',
    className: 'text-right',
    render: (ticket) => (
      <span className="text-xs text-muted-foreground">{daysSince(ticket.createdAt)}d</span>
    ),
  },
]

const cardConfig: CardConfig<TicketItem> = {
  icon: (ticket) => (
    <Avatar className="h-9 w-9 border border-border">
      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
        {getInitials(getLeadName(ticket))}
      </AvatarFallback>
    </Avatar>
  ),
  title: getLeadName,
  subtitle: (ticket) => (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ticket.stage.color }} />
      <span className="text-xs text-muted-foreground">{ticket.stage.name}</span>
    </div>
  ),
  badge: (ticket) => {
    const s = STATUS_BADGE[ticket.status]
    return s ? <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge> : null
  },
  footer: (ticket) => (
    <div className="flex items-center justify-between w-full">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        {ticket.messagesCount}
      </span>
      {ticket.dealValue ? (
        <span className="text-xs font-semibold text-emerald-600">{formatCurrencyBRL(ticket.dealValue)}</span>
      ) : (
        <span className="text-xs text-muted-foreground">{daysSince(ticket.createdAt)}d atrás</span>
      )}
    </div>
  ),
}

function TicketKanbanCard({ ticket }: { ticket: TicketItem }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2 mb-2">
        <Avatar className="h-7 w-7 border border-border/50 shrink-0 mt-0.5">
          <AvatarFallback className="text-[9px] bg-primary/5 text-primary font-semibold">
            {getInitials(getLeadName(ticket))}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{getLeadName(ticket)}</p>
          {ticket.lead.phone && (
            <p className="text-[11px] text-muted-foreground font-mono truncate">{ticket.lead.phone}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {daysSince(ticket.createdAt)}d
        </span>
        {ticket.dealValue && (
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <DollarSign className="h-3 w-3" />
            {formatCurrencyBRL(ticket.dealValue)}
          </span>
        )}
        {ticket.assignee && (
          <Avatar className="h-4 w-4">
            <AvatarFallback className="text-[8px] bg-muted">{getInitials(ticket.assignee.name)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

export default function TicketsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.length >= 3 ? searchInput.trim() : '')
    }, 400)
    return () => clearTimeout(handle)
  }, [searchInput])

  const filters = React.useMemo(() => ({
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(dateRange !== 'all' ? { dateRange } : {}),
  }), [debouncedSearch, statusFilter, dateRange])

  const {
    data: tickets,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCrudInfiniteQuery<TicketItem>({
    queryKey: ['tickets'],
    endpoint: '/api/v1/tickets',
    pageSize: 30,
    filters,
  })

  // Fetch stages for Kanban
  const { data: stagesData } = useQuery<{ items: KanbanColumn[] }>({
    queryKey: ['ticket-stages'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ticket-stages')
      if (!res.ok) throw new Error('Falha ao carregar fases')
      return res.json()
    },
    enabled: view === 'kanban',
  })
  const kanbanColumns: KanbanColumn[] = stagesData?.items ?? []

  // Move ticket mutation
  const moveMutation = useMutation({
    mutationFn: async ({ ticketId, stageId }: { ticketId: string; stageId: string }) => {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao mover ticket')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const filtersNode = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-7 w-36 text-xs border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="h-7 w-36 text-xs border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <CrudPageShell
      title="Tickets"
      subtitle="Gerencie seu pipeline de atendimento."
      icon={Ticket}
      view={view}
      setView={setView}
      enabledViews={['list', 'cards', 'kanban']}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Buscar por nome, telefone..."
      totalItems={total}
      isFetchingMore={isFetchingNextPage}
      filters={filtersNode}
      isLoading={isLoading}
    >
      <CrudDataView
        data={tickets}
        view={view}
        tableView={
          <CrudListView
            data={tickets}
            columns={columns}
            onEndReached={hasNextPage ? fetchNextPage : undefined}
          />
        }
        cardView={
          <CrudCardView
            data={tickets}
            config={cardConfig}
            onEndReached={hasNextPage ? fetchNextPage : undefined}
          />
        }
        kanbanView={
          <CrudKanbanView
            columns={kanbanColumns}
            items={tickets}
            getItemId={(t) => t.id}
            getColumnId={(t) => t.stage.id}
            renderCard={(ticket) => <TicketKanbanCard ticket={ticket} />}
            onMoveItem={(ticketId, stageId) => moveMutation.mutate({ ticketId, stageId })}
          />
        }
      />
    </CrudPageShell>
  )
}
