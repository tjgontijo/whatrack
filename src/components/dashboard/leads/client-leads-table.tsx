'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

import { ResponsiveDataTable } from '@/components/data-table/responsive-data-table'
import { PageHeader } from '@/components/data-table/page-header'
import { ContentHeader, ContentHeaderTabs, ContentHeaderActions } from '@/components/data-table/content-header'
import { ContentHeaderTab } from '@/components/data-table/content-header-tab'
import { SegmentedControl } from '@/components/data-table/segmented-control'
import { LeadCard } from '@/components/data-table/cards/lead-card'
import { FilterInput } from '@/components/data-table/filters/filter-input'
import { FilterSelect } from '@/components/data-table/filters/filter-select'
import { FilterGroup } from '@/components/data-table/filters/filter-group'
import { DataTableFiltersButton } from '@/components/data-table/filters/data-table-filters-button'
import { DataTableFiltersSheet } from '@/components/data-table/filters/data-table-filters-sheet'
import { Button } from '@/components/ui/button'
import { FloatingActionButton } from '@/components/data-table/floating-action-button'
import { useIsMobile } from '@/hooks/use-mobile'

import { NewLeadDialog } from '@/components/dashboard/leads/new-lead_dialog'

import { Plus, LayoutGrid, List } from 'lucide-react'

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

type Lead = {
  id: string
  name: string | null
  phone: string | null
  mail: string | null
  remoteJid: string | null
  createdAt: Date
}

type ApiResponse = {
  items: Lead[]
  total: number
  page: number
  pageSize: number
}

export default function ClientLeadsTable() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobileDevice = useIsMobile()
  const isDesktop = !isMobileDevice

  // Desktop view mode state (table or cards)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Filters
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

  // Update query params
  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      mutator(params)
      params.set('page', '1')
      router.push(`/dashboard/leads?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Search input state with debounce
  const [input, setInput] = React.useState(q)
  React.useEffect(() => setInput(q), [q])

  React.useEffect(() => {
    const trimmed = input.trim()

    if (trimmed.length === 0) {
      if (q) {
        updateQueryParams((params) => {
          params.delete('q')
        })
      }
      return undefined
    }

    if (trimmed.length < 3) {
      if (q) {
        updateQueryParams((params) => {
          params.delete('q')
        })
      }
      return undefined
    }

    if (trimmed === q) {
      return undefined
    }

    const handle = window.setTimeout(() => {
      updateQueryParams((params) => {
        params.set('q', trimmed)
      })
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [input, q, updateQueryParams])

  // Fetch data
  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ['leads', q, page, pageSize, dateRange ?? null] as const,
    queryFn: async (): Promise<ApiResponse> => {
      const u = new URL('/api/v1/leads', window.location.origin)
      if (q) u.searchParams.set('q', q)
      u.searchParams.set('page', String(page))
      u.searchParams.set('pageSize', String(pageSize))
      if (dateRange) {
        u.searchParams.set('dateRange', dateRange)
      }
      const res = await fetch(u.toString(), { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch')
      return (await res.json()) as ApiResponse
    },
    placeholderData: (prev) => prev as ApiResponse | undefined,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = React.useState(false)

  // Desktop columns for ResponsiveDataTable
  const columns = React.useMemo<ColumnDef<Lead>[]>(
    () => [
      { header: 'Nome', accessorKey: 'name', cell: ({ getValue }) => getValue() || '-' },
      { header: 'Telefone', accessorKey: 'phone', cell: ({ getValue }) => getValue() || '-' },
      { header: 'Email', accessorKey: 'mail', cell: ({ getValue }) => getValue() || '-' },
      { header: 'Criado em', accessorKey: 'createdAt', cell: ({ getValue }) => new Date(getValue() as Date).toLocaleString('pt-BR') },
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
    return count
  }, [q, dateRange])

  return (
    <div className="space-y-4">
      {/* Page Header - Title + Description + Statistics */}
      <PageHeader
        title="Leads"
        description="Manage and track your potential customers."
        stats={[
          {
            label: 'TOTAL LEADS',
            value: total,
          },
        ]}
      />

      {/* Content Header - Search + Tabs + View Toggle + Filters Button + Add Lead */}
      <ContentHeader>
        <FilterInput
          value={input}
          onChange={setInput}
          placeholder="Pesquisar leads..."
          isLoading={isLoading}
        />

        <ContentHeaderTabs>
          <ContentHeaderTab
            items={[
              { value: 'all', label: 'All' },
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'customer', label: 'Customer' },
            ]}
            value={statusFilter}
            onChange={(value) => {
              const params = new URLSearchParams(Array.from(searchParams.entries()))
              if (value === 'all') {
                params.delete('status')
              } else {
                params.set('status', value)
              }
              params.set('page', '1')
              router.push(`/dashboard/leads?${params.toString()}`)
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

        <ContentHeaderActions>
          <Button
            size="sm"
            onClick={() => setIsNewLeadDialogOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>
        </ContentHeaderActions>
      </ContentHeader>

      {/* Filters Sheet (Mobile & Desktop) */}
      <DataTableFiltersSheet
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        title="Filtros Avançados"
        onApply={() => setIsFiltersOpen(false)}
      >
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
      </DataTableFiltersSheet>

      {/* Responsive Table */}
      <ResponsiveDataTable
        data={items}
        columns={columns}
        mobileCard={(row) => (
          <LeadCard
            lead={row.original}
            onOpenDialog={() => { }}
          />
        )}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: (newPage) => {
            const params = new URLSearchParams(Array.from(searchParams.entries()))
            params.set('page', String(newPage))
            router.push(`/dashboard/leads?${params.toString()}`)
          },
          onPageSizeChange: (newPageSize) => {
            const params = new URLSearchParams(Array.from(searchParams.entries()))
            params.set('pageSize', String(newPageSize))
            params.set('page', '1')
            router.push(`/dashboard/leads?${params.toString()}`)
          },
        }}
        forceCardView={isDesktop && viewMode === 'cards'}
        isLoading={isLoading}
        isError={isError}
      />

      {/* New Lead Dialog */}
      <NewLeadDialog
        open={isNewLeadDialogOpen}
        onOpenChange={setIsNewLeadDialogOpen}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        icon={Plus}
        label="Criar novo lead"
        onClick={() => setIsNewLeadDialogOpen(true)}
      />
    </div>
  )
}
