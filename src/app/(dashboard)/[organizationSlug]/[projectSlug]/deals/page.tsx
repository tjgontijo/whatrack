'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, DollarSign, MessageSquare, SlidersHorizontal } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CrudCardView } from '@/features/dashboard/components/crud/crud-card-view'
import { CrudDataView, CrudEmptyState } from '@/features/dashboard/components/crud/crud-data-view'
import { CrudKanbanView } from '@/features/dashboard/components/crud/crud-kanban-view'
import { CrudListView } from '@/features/dashboard/components/crud/crud-list-view'
import type {
  CardConfig,
  ColumnDef,
  KanbanColumn,
  ViewType,
} from '@/features/dashboard/components/crud/types'
import { ViewSwitcher } from '@/features/dashboard/components/crud/view-switcher'
import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { PipelineConfigSheet } from '@/features/dashboard/components/pipeline/pipeline-config-sheet'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

type DealItem = {
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

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
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

const getLeadName = (deal: DealItem) =>
  deal.lead.name || deal.lead.pushName || deal.lead.phone || 'Sem nome'

const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

const daysSince = (date: string) => {
  const diff = Date.now() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const columns: ColumnDef<DealItem>[] = [
  {
    key: 'lead',
    label: 'Lead',
    render: (deal) => (
      <div className='flex items-center gap-2.5'>
        <Avatar className='h-7 w-7 shrink-0 border border-border/50'>
          <AvatarFallback className='bg-primary/5 font-semibold text-[9px] text-primary'>
            {getInitials(getLeadName(deal))}
          </AvatarFallback>
        </Avatar>
        <span className='truncate font-medium text-[13px]'>{getLeadName(deal)}</span>
      </div>
    ),
  },
  {
    key: 'stage',
    label: 'Fase',
    width: 160,
    render: (deal) => (
      <div className='flex items-center gap-1.5'>
        <span
          className='h-2 w-2 shrink-0 rounded-full'
          style={{ backgroundColor: deal.stage.color }}
        />
        <span className='text-sm'>{deal.stage.name}</span>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: 110,
    render: (deal) => {
      const s = STATUS_BADGE[deal.status]
      return s ? (
        <Badge variant={s.variant}>{s.label}</Badge>
      ) : (
        <span className='text-muted-foreground'>—</span>
      )
    },
  },
  {
    key: 'dealValue',
    label: 'Valor',
    width: 120,
    render: (deal) => (
      <span className='font-semibold text-emerald-600'>
        {deal.dealValue ? (
          formatCurrencyBRL(deal.dealValue)
        ) : (
          <span className='text-muted-foreground'>—</span>
        )}
      </span>
    ),
  },
  {
    key: 'assignee',
    label: 'Responsável',
    width: 140,
    render: (deal) =>
      deal.assignee ? (
        <span className='text-muted-foreground text-sm'>{deal.assignee.name}</span>
      ) : (
        <span className='text-muted-foreground'>—</span>
      ),
  },
  {
    key: 'createdAt',
    label: 'Criado há',
    width: 100,
    headerClassName: 'text-right',
    className: 'text-right',
    render: (deal) => (
      <span className='text-muted-foreground text-xs'>{daysSince(deal.createdAt)}d</span>
    ),
  },
]

const cardConfig: CardConfig<DealItem> = {
  icon: (deal) => (
    <Avatar className='h-9 w-9 border border-border'>
      <AvatarFallback className='bg-primary/5 font-bold text-primary text-xs'>
        {getInitials(getLeadName(deal))}
      </AvatarFallback>
    </Avatar>
  ),
  title: getLeadName,
  subtitle: (deal) => (
    <div className='mt-0.5 flex items-center gap-1.5'>
      <span
        className='h-2 w-2 shrink-0 rounded-full'
        style={{ backgroundColor: deal.stage.color }}
      />
      <span className='text-muted-foreground text-xs'>{deal.stage.name}</span>
    </div>
  ),
  badge: (deal) => {
    const s = STATUS_BADGE[deal.status]
    return s ? (
      <Badge variant={s.variant} className='text-[10px]'>
        {s.label}
      </Badge>
    ) : null
  },
  footer: (deal) => (
    <div className='flex w-full items-center justify-between'>
      <span className='flex items-center gap-1 text-muted-foreground text-xs'>
        <MessageSquare className='h-3 w-3' />
        {deal.messagesCount}
      </span>
      {deal.dealValue ? (
        <span className='font-semibold text-emerald-600 text-xs'>
          {formatCurrencyBRL(deal.dealValue)}
        </span>
      ) : (
        <span className='text-muted-foreground text-xs'>{daysSince(deal.createdAt)}d atrás</span>
      )}
    </div>
  ),
}

function DealKanbanCard({ deal }: { deal: DealItem }) {
  return (
    <div className='rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md'>
      <div className='mb-2 flex items-start gap-2'>
        <Avatar className='mt-0.5 h-7 w-7 shrink-0 border border-border/50'>
          <AvatarFallback className='bg-primary/5 font-semibold text-[9px] text-primary'>
            {getInitials(getLeadName(deal))}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1'>
          <p className='truncate font-semibold text-sm leading-tight'>{getLeadName(deal)}</p>
          {deal.lead.phone && (
            <p className='truncate font-mono text-[11px] text-muted-foreground'>
              {deal.lead.phone}
            </p>
          )}
        </div>
      </div>

      <div className='mt-2 flex items-center justify-between text-[11px] text-muted-foreground'>
        <span className='flex items-center gap-1'>
          <Calendar className='h-3 w-3' />
          {daysSince(deal.createdAt)}d
        </span>
        {deal.dealValue && (
          <span className='flex items-center gap-1 font-semibold text-emerald-600'>
            <DollarSign className='h-3 w-3' />
            {formatCurrencyBRL(deal.dealValue)}
          </span>
        )}
        {deal.assignee && (
          <Avatar className='h-4 w-4'>
            <AvatarFallback className='bg-muted text-[8px]'>
              {getInitials(deal.assignee.name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

export default function DealsPage() {
  const { organizationId } = useRequiredProjectRouteContext()
  const queryClient = useQueryClient()
  const [view, setView] = useState<ViewType>('kanban')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [pipelineSheetOpen, setPipelineSheetOpen] = useState(false)

  const deferredSearch = React.useDeferredValue(searchInput)

  const filters = React.useMemo(() => {
    const search = deferredSearch.trim()
    const hasSearch = search.length >= 3

    return {
      ...(hasSearch ? { q: search } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(dateRange !== 'all' ? { dateRange } : {}),
    }
  }, [deferredSearch, statusFilter, dateRange])

  const {
    data: deals,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useCrudInfiniteQuery<DealItem>({
    queryKey: ['deals'],
    endpoint: '/api/v1/deals',
    pageSize: 30,
    filters,
  })

  // Fetch stages for Kanban
  const { data: stagesData } = useQuery<{ items: KanbanColumn[] }>({
    queryKey: ['deal-stages'],
    queryFn: async () => {
      const res = await fetch('/api/v1/deal-stages')
      if (!res.ok) throw new Error('Falha ao carregar fases')
      return res.json()
    },
    enabled: view === 'kanban',
  })
  const kanbanColumns: KanbanColumn[] = stagesData?.items ?? []

  // Move deal mutation
  const moveMutation = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const res = await fetch(`/api/v1/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Falha ao mover deal')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })

  const filtersNode = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className='h-7 w-36 border-border text-xs'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className='text-xs'>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className='h-7 w-36 border-border text-xs'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className='text-xs'>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <>
      <HeaderPageShell
        title='Pipeline'
        selector={
          <ViewSwitcher view={view} setView={setView} enabledViews={['kanban', 'list', 'cards']} />
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder='Buscar por nome, telefone...'
        onRefresh={() => void refetch()}
        isFetchingMore={isFetchingNextPage}
        filters={filtersNode}
        isLoading={isLoading}
        actions={
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 gap-1.5 text-xs'
            onClick={() => setPipelineSheetOpen(true)}
          >
            <SlidersHorizontal className='h-3.5 w-3.5' />
            Configurar pipeline
          </Button>
        }
      >
        <CrudDataView
          data={deals}
          view={view}
          emptyView={<CrudEmptyState />}
          tableView={
            <CrudListView
              data={deals}
              columns={columns}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
          cardView={
            <CrudCardView
              data={deals}
              config={cardConfig}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
          kanbanView={
            <CrudKanbanView
              columns={kanbanColumns}
              items={deals}
              getItemId={(t) => t.id}
              getColumnId={(t) => t.stage.id}
              renderCard={(deal) => <DealKanbanCard deal={deal} />}
              onMoveItem={(dealId, stageId) => moveMutation.mutate({ dealId, stageId })}
            />
          }
        />
      </HeaderPageShell>

      <PipelineConfigSheet
        open={pipelineSheetOpen}
        onOpenChange={setPipelineSheetOpen}
        organizationId={organizationId}
      />
    </>
  )
}
