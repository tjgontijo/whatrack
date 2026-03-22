'use client'

import * as React from 'react'
import { useState, useDeferredValue, useMemo, useCallback } from 'react'

import { CrudDataView, CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { ViewSwitcher } from '@/components/dashboard/crud/view-switcher'
import { HeaderPageShell } from '@/components/dashboard/layout'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import { NewLeadDrawer } from '@/components/dashboard/leads/new-lead-drawer'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type CardConfig,
  type ColumnDef,
  type RowActions,
  type ViewType,
} from '@/components/dashboard/crud/types'

type Lead = {
  id: string
  name: string | null
  phone: string | null
  mail: string | null
  waId: string | null
  createdAt: string
}

const DATE_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '3d', label: '3 dias' },
  { value: '7d', label: '7 dias' },
  { value: '15d', label: '15 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês anterior' },
] as const

const getLeadName = (lead: Lead) => lead.name || lead.phone || lead.mail || 'Sem nome'

const columns: ColumnDef<Lead>[] = [
  {
    key: 'name',
    label: 'Lead',
    render: (lead) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="border-border/50 h-7 w-7 shrink-0 border">
          <AvatarFallback className="bg-primary/5 text-primary text-[9px] font-semibold">
            {getLeadName(lead).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-[13px] font-medium">{getLeadName(lead)}</span>
      </div>
    ),
  },
  {
    key: 'phone',
    label: 'Telefone',
    width: 160,
    render: (lead) => <span className="text-sm">{lead.phone ?? '—'}</span>,
  },
  {
    key: 'mail',
    label: 'Email',
    render: (lead) =>
      lead.mail ? (
        <span className="block max-w-[220px] truncate text-sm">{lead.mail}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: 'createdAt',
    label: 'Criado em',
    width: 170,
    render: (lead) => (
      <span className="text-muted-foreground text-xs">
        {new Date(lead.createdAt).toLocaleString('pt-BR')}
      </span>
    ),
  },
]

const cardConfig: CardConfig<Lead> = {
  icon: (lead) => (
    <Avatar className="border-border h-9 w-9 border">
      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
        {getLeadName(lead).slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  ),
  title: getLeadName,
  subtitle: (lead) => lead.phone || lead.mail || 'Sem contato',
  footer: (lead) => (
    <span className="text-muted-foreground text-xs">
      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
    </span>
  ),
}

export default function ClientLeadsTable() {
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [dateRange, setDateRange] = useState<string>('7d')
  const [isNewLeadDrawerOpen, setIsNewLeadDrawerOpen] = useState(false)

  const deferredSearch = useDeferredValue(searchInput)

  const filters = useMemo(() => {
    const search = deferredSearch.trim()
    const hasSearch = search.length >= 3

    return {
      ...(hasSearch ? { q: search } : {}),
      ...(dateRange ? { dateRange } : {}),
    }
  }, [deferredSearch, dateRange])

  const { data, total, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useCrudInfiniteQuery<Lead>({
      queryKey: ['leads'],
      endpoint: '/api/v1/leads',
      pageSize: 30,
      filters,
    })

  const rowActions: RowActions<Lead> = {
    customActions: () => null,
  }

  const filtersNode = (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">Período</p>
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="border-border h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <>
      <HeaderPageShell
        title="Leads"
        selector={<ViewSwitcher view={view} setView={setView} enabledViews={['list', 'cards']} />}
        onRefresh={() => void refetch()}
        primaryAction={
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setIsNewLeadDrawerOpen(true)}
          >
            Novo
          </Button>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar por nome, telefone..."
        isFetchingMore={isFetchingNextPage}
        filters={filtersNode}
        isLoading={isLoading}
      >
        <CrudDataView
          data={data}
          view={view}
          emptyView={<CrudEmptyState />}
          tableView={
            <CrudListView
              data={data}
              columns={columns}
              rowActions={rowActions}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
          cardView={
            <CrudCardView
              data={data}
              config={cardConfig}
              rowActions={rowActions}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
        />
      </HeaderPageShell>

      <NewLeadDrawer open={isNewLeadDrawerOpen} onOpenChange={setIsNewLeadDrawerOpen} />
    </>
  )
}
