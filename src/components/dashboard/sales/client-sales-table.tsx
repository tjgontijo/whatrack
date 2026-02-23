'use client'

import * as React from 'react'
import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'

import { CrudPageShell } from '@/components/dashboard/crud/crud-page-shell'
import { CrudDataView, CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { useCrudInfiniteQuery } from '@/hooks/use-crud-infinite-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  type CardConfig,
  type ColumnDef,
  type RowActions,
  type ViewType,
} from '@/components/dashboard/crud/types'
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
    render: (sale) => <span className="font-semibold">{formatCurrencyBRL(sale.totalAmount)}</span>,
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
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    key: 'notes',
    label: 'Observações',
    render: (sale) =>
      sale.notes ? (
        <span className="block max-w-[260px] truncate text-sm">{sale.notes}</span>
      ) : (
        <span className="text-muted-foreground">Sem observações</span>
      ),
  },
  {
    key: 'createdAt',
    label: 'Criada em',
    width: 170,
    render: (sale) => (
      <span className="text-muted-foreground text-xs">
        {new Date(sale.createdAt).toLocaleString('pt-BR')}
      </span>
    ),
  },
]

const cardConfig: CardConfig<SaleListItem> = {
  icon: () => <ShoppingCart className="text-primary/60 h-7 w-7" />,
  title: (sale) => formatCurrencyBRL(sale.totalAmount),
  subtitle: (sale) => (
    <span className="text-muted-foreground text-xs">
      {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
    </span>
  ),
  badge: (sale) => {
    const status = sale.status ? STATUS_BADGE[sale.status] : null
    return status ? (
      <Badge variant={status.variant} className="text-[10px]">
        {status.label}
      </Badge>
    ) : null
  },
  footer: (sale) => (
    <span className="text-muted-foreground text-xs truncate">
      {sale.notes || 'Sem observações'}
    </span>
  ),
}

export default function ClientSalesTable() {
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('7d')

  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const debounceRef = React.useRef<NodeJS.Timeout>(null)

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.length >= 3 ? value.trim() : '')
    }, 400)
  }, [])

  const filters = React.useMemo(
    () => ({
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(dateRange ? { dateRange } : {}),
    }),
    [debouncedSearch, statusFilter, dateRange]
  )

  const { data, total, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
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
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="border-border h-7 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="border-border h-7 w-36 text-xs">
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
    </>
  )

  return (
    <CrudPageShell
      title="Vendas"
      showTitle={false}
      icon={ShoppingCart}
      view={view}
      setView={setView}
      enabledViews={['list', 'cards']}
      searchInput={searchInput}
      onSearchChange={handleSearchChange}
      searchPlaceholder="Pesquisar valor, status, observação..."
      totalItems={total}
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
            gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          />
        }
      />
    </CrudPageShell>
  )
}
