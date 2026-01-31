'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { z } from 'zod'

import { ResponsiveDataTable } from '@/components/data-table/responsive-data-table'
import { PageHeader } from '@/components/data-table/page-header'
import { SaleCard } from '@/components/data-table/cards/sale-card'
import { FilterBar, FilterBarSection } from '@/components/data-table/filters/filter-bar'
import { FilterInput } from '@/components/data-table/filters/filter-input'
import { FilterSelect } from '@/components/data-table/filters/filter-select'
import { DataTableFiltersButton } from '@/components/data-table/filters/data-table-filters-button'
import { DataTableFiltersSheet } from '@/components/data-table/filters/data-table-filters-sheet'
import { FilterGroup } from '@/components/data-table/filters/filter-group'

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

// Inline types for sales - simplified without ticket dependencies
const saleItemSchema = z.object({
  id: z.string(),
  totalAmount: z.number().nullable(),
  status: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const salesListResponseSchema = z.object({
  items: z.array(saleItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

type SaleListItem = z.infer<typeof saleItemSchema>
type SalesListResponse = z.infer<typeof salesListResponseSchema>

export default function ClientSalesTable() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Filters
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20))
  const status = searchParams.get('status') || undefined

  const rawDateRange = searchParams.get('dateRange')
  const dateRange = React.useMemo<DateFilterValue | undefined>(() => {
    if (!rawDateRange) return undefined
    return DATE_FILTER_OPTIONS.some((option) => option.value === rawDateRange)
      ? (rawDateRange as DateFilterValue)
      : undefined
  }, [rawDateRange])

  // Update query params
  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      mutator(params)
      params.set('page', '1')
      router.push(`/dashboard/sales?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Search with debounce
  const [input, setInput] = React.useState(q)
  React.useEffect(() => setInput(q), [q])

  React.useEffect(() => {
    const trimmed = input.trim()
    if (trimmed.length === 0 || trimmed.length < 3 || trimmed === q) {
      if (trimmed.length === 0 && q) {
        updateQueryParams((params) => params.delete('q'))
      }
      return
    }
    const handle = window.setTimeout(() => {
      updateQueryParams((params) => params.set('q', trimmed))
    }, 400)
    return () => window.clearTimeout(handle)
  }, [input, q, updateQueryParams])

  // Fetch data
  const { data, isLoading, isError } = useQuery<SalesListResponse>({
    queryKey: ['sales', q, page, pageSize, dateRange ?? null, status ?? null] as const,
    queryFn: async () => {
      const url = new URL('/api/v1/sales', window.location.origin)
      if (q) url.searchParams.set('q', q)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', String(pageSize))
      if (dateRange) url.searchParams.set('dateRange', dateRange)
      if (status) url.searchParams.set('status', status)
      const response = await fetch(url.toString(), { cache: 'no-store' })
      if (!response.ok) throw new Error('Falha ao carregar vendas')
      return salesListResponseSchema.parse(await response.json())
    },
    placeholderData: (prev) => prev as SalesListResponse | undefined,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const statusOptions = ['pending', 'completed', 'cancelled']

  // Columns for desktop view
  const columns = React.useMemo<ColumnDef<SaleListItem>[]>(
    () => [
      { header: 'Data', accessorKey: 'createdAt', cell: ({ getValue }) => new Date(getValue() as string).toLocaleString('pt-BR') },
      { header: 'Valor', accessorKey: 'totalAmount', cell: ({ getValue }) => formatCurrencyBRL(getValue() as number | null) },
      { header: 'Status', accessorKey: 'status', cell: ({ getValue }) => getValue() ?? '—' },
      { header: 'Notas', accessorKey: 'notes', cell: ({ getValue }) => getValue() ?? '—' },
    ],
    []
  )

  // Mobile filters state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (q) count++
    if (dateRange) count++
    if (status) count++
    return count
  }, [q, dateRange, status])

  return (
    <div className="space-y-4">
      {/* Page Header - Title + Description + Statistics */}
      <PageHeader
        title="Vendas"
        description="Acompanhe e gerencie suas vendas."
        stats={[
          {
            label: 'TOTAL VENDAS',
            value: formatCurrencyBRL(items.reduce((sum, item) => sum + (item.totalAmount || 0), 0)),
          },
          {
            label: 'QUANTIDADE',
            value: total,
          },
        ]}
      />

      {/* Desktop Filters */}
      <div className="hidden md:block">
        <FilterBar
          onClearAll={() => {
            updateQueryParams((params) => {
              params.delete('q')
              params.delete('dateRange')
              params.delete('status')
            })
          }}
          showClearButton={activeFilterCount > 0}
        >
          <FilterBarSection title="Busca">
            <FilterInput value={input} onChange={setInput} placeholder="Pesquisar vendas..." />
          </FilterBarSection>

          <FilterBarSection title="Data">
            <FilterSelect
              value={dateRange ?? 'all'}
              onChange={(val) => {
                updateQueryParams((params) => {
                  if (val === 'all') {
                    params.delete('dateRange')
                  } else {
                    params.set('dateRange', val)
                  }
                })
              }}
              options={[
                { value: 'all', label: 'Todas as datas' },
                ...DATE_FILTER_OPTIONS,
              ]}
              placeholder="Selecione data"
            />
          </FilterBarSection>

          {statusOptions.length > 0 && (
            <FilterBarSection title="Status">
              <FilterSelect
                value={status ?? 'all'}
                onChange={(val) => {
                  updateQueryParams((params) => {
                    if (val === 'all') {
                      params.delete('status')
                    } else {
                      params.set('status', val)
                    }
                  })
                }}
                options={[
                  { value: 'all', label: 'Todos os status' },
                  ...statusOptions.map((s) => ({ value: s, label: s })),
                ]}
                placeholder="Selecione status"
              />
            </FilterBarSection>
          )}
        </FilterBar>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <DataTableFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
      </div>

      {/* Mobile Filters Sheet */}
      <DataTableFiltersSheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen} title="Filtros">
        <FilterGroup label="Busca">
          <FilterInput value={input} onChange={setInput} placeholder="Pesquisar vendas..." />
        </FilterGroup>

        <FilterGroup label="Data">
          <FilterSelect
            value={dateRange ?? 'all'}
            onChange={(val) => {
              updateQueryParams((params) => {
                if (val === 'all') {
                  params.delete('dateRange')
                } else {
                  params.set('dateRange', val)
                }
              })
            }}
            options={[
              { value: 'all', label: 'Todas as datas' },
              ...DATE_FILTER_OPTIONS,
            ]}
            placeholder="Selecione data"
          />
        </FilterGroup>

        {statusOptions.length > 0 && (
          <FilterGroup label="Status">
            <FilterSelect
              value={status ?? 'all'}
              onChange={(val) => {
                updateQueryParams((params) => {
                  if (val === 'all') {
                    params.delete('status')
                  } else {
                    params.set('status', val)
                  }
                })
              }}
              options={[
                { value: 'all', label: 'Todos os status' },
                ...statusOptions.map((s) => ({ value: s, label: s })),
              ]}
              placeholder="Selecione status"
            />
          </FilterGroup>
        )}
      </DataTableFiltersSheet>

      {/* Responsive Table */}
      <ResponsiveDataTable
        data={items}
        columns={columns}
        mobileCard={(row) => (
          <SaleCard
            id={row.original.id}
            amount={row.original.totalAmount}
            serviceCount={0}
            createdAt={row.original.createdAt}
            ticketStageName={null}
            ticketPipefyId={null}
            ticketPipefyUrl={null}
            ticketUtmSource={null}
            ticketUtmMedium={null}
            ticketUtmCampaign={null}
            leadId={null}
            leadName={null}
            leadPhone={null}
            onViewLead={() => { }}
          />
        )}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: (newPage) => {
            const params = new URLSearchParams(Array.from(searchParams.entries()))
            params.set('page', String(newPage))
            router.push(`/dashboard/sales?${params.toString()}`)
          },
          onPageSizeChange: (newPageSize) => {
            const params = new URLSearchParams(Array.from(searchParams.entries()))
            params.set('pageSize', String(newPageSize))
            params.set('page', '1')
            router.push(`/dashboard/sales?${params.toString()}`)
          },
        }}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  )
}
