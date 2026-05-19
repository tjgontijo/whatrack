'use client'

import { ShoppingCart } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CrudDataView, CrudEmptyState } from '@/features/dashboard/components/crud/crud-data-view'
import { CrudListView } from '@/features/dashboard/components/crud/crud-list-view'
import type {
  ColumnDef,
  RowActions,
  ViewType,
} from '@/features/dashboard/components/crud/types'
import { ViewSwitcher } from '@/features/dashboard/components/crud/view-switcher'
import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

type SaleListItem = {
  id: string
  totalAmount: number | null
  status: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
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

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'completed', label: 'Concluídas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'cancelled', label: 'Canceladas' },
] as const

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  completed: { label: 'Concluída', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

const columns: ColumnDef<SaleListItem>[] = [
  {
    key: 'totalAmount',
    label: 'Valor da Venda',
    render: (sale) => <span className='font-semibold'>{formatCurrencyBRL(sale.totalAmount)}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    width: 130,
    render: (sale) => {
      const status = sale.status ? STATUS_BADGE[sale.status] : null
      return status ? (
        <Badge variant={status.variant}>{status.label}</Badge>
      ) : (
        <span className='text-muted-foreground'>—</span>
      )
    },
  },
  {
    key: 'notes',
    label: 'Observações',
    render: (sale) =>
      sale.notes ? (
        <span className='block max-w-[260px] truncate text-sm'>{sale.notes}</span>
      ) : (
        <span className='text-muted-foreground'>Sem observações</span>
      ),
  },
  {
    key: 'createdAt',
    label: 'Criada em',
    width: 170,
    render: (sale) => (
      <span className='text-muted-foreground text-xs'>
        {new Date(sale.createdAt).toLocaleString('pt-BR')}
      </span>
    ),
  },
]

export default function ClientSalesTable() {
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('7d')

  const deferredSearch = useDeferredValue(searchInput)

  const filters = useMemo(() => {
    const search = deferredSearch.trim()
    const hasSearch = search.length >= 3

    return {
      ...(hasSearch ? { q: search } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(dateRange ? { dateRange } : {}),
    }
  }, [deferredSearch, statusFilter, dateRange])

  const { data, total, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useCrudInfiniteQuery<SaleListItem>({
      queryKey: ['sales'],
      endpoint: '/api/v1/sales',
      pageSize: 30,
      filters,
    })

  const rowActions: RowActions<SaleListItem> = {
    customActions: () => null,
  }

  const filtersNode = (
    <>
      <div className='space-y-1.5'>
        <p className='font-medium text-muted-foreground text-xs'>Status</p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='h-8 w-full border-border text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className='text-xs'>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-1.5'>
        <p className='font-medium text-muted-foreground text-xs'>Período</p>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className='h-8 w-full border-border text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className='text-xs'>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )

  return (
    <HeaderPageShell
      title='Vendas'
      selector={<ViewSwitcher view={view} setView={setView} enabledViews={['list']} />}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder='Pesquisar valor, status, observação...'
      onRefresh={() => void refetch()}
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
      />
    </HeaderPageShell>
  )
}
