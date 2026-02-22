'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { useSearchParams, useRouter } from 'next/navigation'
import { z } from 'zod'

import { ResponsiveDataTable } from '@/components/data-table/responsive-data-table'
import { PageHeader } from '@/components/data-table/page-header'
import { ContentHeader, ContentHeaderTabs } from '@/components/data-table/content-header'
import { ContentHeaderTab } from '@/components/data-table/content-header-tab'
import { SegmentedControl } from '@/components/data-table/segmented-control'
import { FilterInput } from '@/components/data-table/filters/filter-input'
import { FilterSelect } from '@/components/data-table/filters/filter-select'
import { FilterGroup } from '@/components/data-table/filters/filter-group'
import { DataTableFiltersButton } from '@/components/data-table/filters/data-table-filters-button'
import { DataTableFiltersSheet } from '@/components/data-table/filters/data-table-filters-sheet'
import { useIsMobile } from '@/hooks/use-mobile'

import { LayoutGrid, List, ShoppingCart } from 'lucide-react'
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

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  completed: { label: 'Concluída', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

type ApiResponse = {
  items: SaleListItem[]
  total: number
  page: number
  pageSize: number
}

// Minimal Mobile Card rendering for the Responsive Data Table
function SaleCard({ item }: { item: SaleListItem }) {
  const s = item.status ? STATUS_BADGE[item.status] : null
  return (
    <div className="flex flex-col gap-2 p-4 bg-white dark:bg-card border shadow-sm rounded-xl hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-foreground">
              {formatCurrencyBRL(item.totalAmount)}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
      {(item.notes || s) && (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted-foreground truncate max-w-[180px]">
            {item.notes || 'Sem observações'}
          </span>
          {s && <Badge variant={s.variant} className="text-[10px] uppercase font-bold tracking-wider">{s.label}</Badge>}
        </div>
      )}
    </div>
  )
}

export default function ClientSalesTable() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobileDevice = useIsMobile()
  const isDesktop = !isMobileDevice

  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table')
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false)

  // Filters from URL
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10) || 20))
  const statusFilter = searchParams.get('status') || 'all'
  const rawDateRange = searchParams.get('dateRange')
  const dateRange = React.useMemo<DateFilterValue | undefined>(() => {
    if (!rawDateRange) return undefined
    return DATE_FILTER_OPTIONS.some((option) => option.value === rawDateRange)
      ? (rawDateRange as DateFilterValue)
      : undefined
  }, [rawDateRange])

  // URL updating helper
  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      mutator(params)
      params.set('page', '1') // Reset page on filter
      router.push(`/dashboard/sales?${params.toString()}`)
    },
    [router, searchParams]
  )

  const [input, setInput] = React.useState(q)
  React.useEffect(() => setInput(q), [q])

  // Debounced search logic
  React.useEffect(() => {
    const trimmed = input.trim()

    if (trimmed.length === 0) {
      if (q) updateQueryParams((p) => p.delete('q'))
      return undefined
    }

    if (trimmed.length < 3) {
      if (q) updateQueryParams((p) => p.delete('q'))
      return undefined
    }

    if (trimmed === q) return undefined

    const handle = window.setTimeout(() => {
      updateQueryParams((p) => p.set('q', trimmed))
    }, 400)

    return () => window.clearTimeout(handle)
  }, [input, q, updateQueryParams])

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ['sales', q, page, pageSize, dateRange ?? null, statusFilter] as const,
    queryFn: async (): Promise<ApiResponse> => {
      const u = new URL('/api/v1/sales', window.location.origin)
      if (q) u.searchParams.set('q', q)
      u.searchParams.set('page', String(page))
      u.searchParams.set('pageSize', String(pageSize))
      if (dateRange) u.searchParams.set('dateRange', dateRange)
      if (statusFilter !== 'all') u.searchParams.set('status', statusFilter)

      const res = await fetch(u.toString(), { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch sales')
      return (await res.json()) as ApiResponse
    },
    placeholderData: (prev) => prev as ApiResponse | undefined,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const columns = React.useMemo<ColumnDef<SaleListItem>[]>(
    () => [
      {
        header: 'Valor da Compra',
        accessorKey: 'totalAmount',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/50 text-emerald-600">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <span className="font-bold text-foreground">
              {formatCurrencyBRL(row.original.totalAmount)}
            </span>
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const s = row.original.status ? STATUS_BADGE[row.original.status] : null
          return s ? <Badge variant={s.variant} className="uppercase tracking-wider text-[10px] font-bold">{s.label}</Badge> : <span className="text-muted-foreground">—</span>
        },
      },
      {
        header: 'Notas / Campanha',
        accessorKey: 'notes',
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium truncate max-w-[200px] block">
            {row.original.notes || 'Sem observações'}
          </span>
        ),
      },
      {
        header: 'Data do Registro',
        accessorKey: 'createdAt',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString('pt-BR')}
          </span>
        ),
      },
    ],
    []
  )

  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (q) count++
    if (dateRange) count++
    if (statusFilter !== 'all') count++
    return count
  }, [q, dateRange, statusFilter])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Histórico de Vendas"
        description="Acompanhe todas as vendas capturadas em tempo real pelas integrações."
        stats={[
          {
            label: 'TOTAL DE VENDAS',
            value: total,
          },
        ]}
      />

      <ContentHeader>
        <FilterInput
          value={input}
          onChange={setInput}
          placeholder="Pesquisar valor, ID..."
          isLoading={isLoading}
        />

        <ContentHeaderTabs>
          <ContentHeaderTab
            items={[
              { value: 'all', label: 'Todas' },
              { value: 'completed', label: 'Concluídas' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'cancelled', label: 'Canceladas' },
            ]}
            value={statusFilter}
            onChange={(value) => {
              updateQueryParams((params) => {
                if (value === 'all') params.delete('status')
                else params.set('status', value)
              })
            }}
          />
        </ContentHeaderTabs>

        {isDesktop && (
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode as (value: string) => void}
            options={[
              { value: 'table', icon: <List className="w-4 h-4" />, label: 'Tabela' },
              { value: 'cards', icon: <LayoutGrid className="w-4 h-4" />, label: 'Cards' },
            ]}
            aria-label="Modo de visualização"
          />
        )}

        <DataTableFiltersButton
          activeCount={activeFilterCount}
          onClick={() => setIsFiltersOpen(true)}
        />
      </ContentHeader>

      <DataTableFiltersSheet
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        title="Filtros de Vendas"
        onApply={() => setIsFiltersOpen(false)}
      >
        <FilterGroup label="Período das Vendas">
          <FilterSelect
            value={dateRange ?? 'all'}
            onChange={(val) => {
              updateQueryParams((params) => {
                if (val === 'all') params.delete('dateRange')
                else params.set('dateRange', val)
              })
            }}
            options={[
              { value: 'all', label: 'Todas as datas' },
              ...DATE_FILTER_OPTIONS,
            ]}
            placeholder="Filtrar por data..."
          />
        </FilterGroup>
      </DataTableFiltersSheet>

      <ResponsiveDataTable
        data={items}
        columns={columns}
        mobileCard={(row) => <SaleCard item={row.original} />}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: (newPage) => {
            updateQueryParams((p) => p.set('page', String(newPage)))
          },
          onPageSizeChange: (newPageSize) => {
            updateQueryParams((p) => p.set('pageSize', String(newPageSize)))
          },
        }}
        forceCardView={isDesktop && viewMode === 'cards'}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  )
}
