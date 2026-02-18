'use client'

import * as React from 'react'
import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { z } from 'zod'

import { CrudPageShell } from '@/components/dashboard/crud/crud-page-shell'
import { CrudDataView } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { useCrudInfiniteQuery } from '@/hooks/use-crud-infinite-query'
import { type ColumnDef, type CardConfig, type ViewType } from '@/components/dashboard/crud/types'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import { formatCurrencyBRL } from '@/lib/mask/formatters'

const DATE_FILTER_OPTIONS = [
  { value: '1d', label: '1 dia' },
  { value: '3d', label: '3 dias' },
  { value: '7d', label: '7 dias' },
  { value: '14d', label: '14 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês anterior' },
] as const

type DateFilterValue = (typeof DATE_FILTER_OPTIONS)[number]['value']

const saleItemSchema = z.object({
  id: z.string(),
  totalAmount: z.number().nullable(),
  status: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

type SaleListItem = z.infer<typeof saleItemSchema>

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
]

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  completed: { label: 'Concluída', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

const columns: ColumnDef<SaleListItem>[] = [
  {
    key: 'createdAt',
    label: 'Data',
    width: 180,
    render: (item) => new Date(item.createdAt).toLocaleString('pt-BR'),
  },
  {
    key: 'totalAmount',
    label: 'Valor',
    width: 140,
    render: (item) => (
      <span className="font-semibold">{formatCurrencyBRL(item.totalAmount)}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: 130,
    render: (item) => {
      const s = item.status ? STATUS_BADGE[item.status] : null
      return s ? (
        <Badge variant={s.variant}>{s.label}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    key: 'notes',
    label: 'Notas',
    render: (item) => item.notes ?? <span className="text-muted-foreground">—</span>,
  },
]

const cardConfig: CardConfig<SaleListItem> = {
  icon: () => <ShoppingCart className="h-7 w-7 text-primary/60" />,
  title: (item) => formatCurrencyBRL(item.totalAmount),
  subtitle: (item) => item.notes ? (
    <span className="text-xs text-muted-foreground line-clamp-1">{item.notes}</span>
  ) : null,
  badge: (item) => {
    const s = item.status ? STATUS_BADGE[item.status] : null
    return s ? (
      <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>
    ) : null
  },
  footer: (item) => (
    <span className="text-xs text-muted-foreground">
      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
    </span>
  ),
}

export default function ClientSalesTable() {
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [dateRange, setDateRange] = useState<DateFilterValue | 'all'>('all')
  const [status, setStatus] = useState<string>('all')

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
    ...(dateRange !== 'all' ? { dateRange } : {}),
    ...(status !== 'all' ? { status } : {}),
  }), [debouncedSearch, dateRange, status])

  const {
    data,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCrudInfiniteQuery<SaleListItem>({
    queryKey: ['sales'],
    endpoint: '/api/v1/sales',
    pageSize: 30,
    filters,
  })

  const filtersNode = (
    <>
      <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateFilterValue | 'all')}>
        <SelectTrigger className="h-7 w-36 text-xs border-border">
          <SelectValue placeholder="Todas as datas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Todas as datas</SelectItem>
          {DATE_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-7 w-36 text-xs border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <CrudPageShell
      title="Vendas"
      subtitle="Acompanhe e gerencie suas vendas."
      icon={ShoppingCart}
      view={view}
      setView={setView}
      enabledViews={['list', 'cards']}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Buscar vendas..."
      totalItems={total}
      isFetchingMore={isFetchingNextPage}
      filters={filtersNode}
      isLoading={isLoading}
    >
      <CrudDataView
        data={data}
        view={view}
        tableView={
          <CrudListView
            data={data}
            columns={columns}
            onEndReached={hasNextPage ? fetchNextPage : undefined}
          />
        }
        cardView={
          <CrudCardView
            data={data}
            config={cardConfig}
            onEndReached={hasNextPage ? fetchNextPage : undefined}
          />
        }
      />
    </CrudPageShell>
  )
}
