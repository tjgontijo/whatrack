'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

import { ResponsiveDataTable } from '@/components/data-table/responsive-data-table'
import { LeadCard } from '@/components/data-table/cards/lead-card'
import { FilterInput } from '@/components/data-table/filters/filter-input'
import { FilterSelect } from '@/components/data-table/filters/filter-select'
import { FilterSwitch } from '@/components/data-table/filters/filter-switch'
import { FilterGroup } from '@/components/data-table/filters/filter-group'
import { FilterBar, FilterBarSection } from '@/components/data-table/filters/filter-bar'
import { DataTableFiltersButton } from '@/components/data-table/filters/data-table-filters-button'
import { DataTableFiltersSheet } from '@/components/data-table/filters/data-table-filters-sheet'
import { FloatingActionButton } from '@/components/data-table/floating-action-button'
import { HeaderActions } from '@/components/dashboard/header-actions'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'

import { LeadTicketsDialog } from '@/components/dashboard/tickets/lead-tickets-dialog'
import { LeadSalesDialog } from '@/components/dashboard/sales/lead-sales-dialog'
import { LeadMessagesDialog } from '@/components/dashboard/messages/lead-messages-dialog'
import { LeadAuditDialog } from '@/components/dashboard/sales_analytics/lead-audit-dialog'
import { NewLeadDialog } from '@/components/dashboard/leads/new-lead_dialog'

import { Inbox, ShoppingBag, MessageSquareText, ClipboardCheck, Plus, LayoutGrid, List, X } from 'lucide-react'

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
type DateFilterSelectValue = DateFilterValue | 'all'
type BooleanFilterKey = 'hasTickets' | 'hasSales' | 'hasMessages' | 'hasAudit'

const BOOLEAN_FILTER_OPTIONS: Array<{ key: BooleanFilterKey; label: string }> = [
  { key: 'hasTickets', label: 'Com Tickets' },
  { key: 'hasSales', label: 'Com Vendas' },
  { key: 'hasMessages', label: 'Com Mensagens' },
  { key: 'hasAudit', label: 'Com Auditoria' },
]

type Lead = {
  id: string
  name: string | null
  phone: string | null
  mail: string | null
  remoteJid: string | null
  createdAt: Date
  hasTickets: boolean
  hasSales: boolean
  hasAudit: boolean
  hasMessages: boolean
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

  const rawDateRange = searchParams.get('dateRange')
  const dateRange = React.useMemo<DateFilterValue | undefined>(() => {
    if (!rawDateRange) return undefined
    return DATE_FILTER_OPTIONS.some((option) => option.value === rawDateRange)
      ? (rawDateRange as DateFilterValue)
      : undefined
  }, [rawDateRange])

  const activeBooleanFilters = React.useMemo<Record<BooleanFilterKey, boolean>>(() => {
    return {
      hasTickets: searchParams.get('hasTickets') === 'true',
      hasSales: searchParams.get('hasSales') === 'true',
      hasMessages: searchParams.get('hasMessages') === 'true',
      hasAudit: searchParams.get('hasAudit') === 'true',
    }
  }, [searchParams])

  const booleanFilterKey = React.useMemo(() => JSON.stringify(activeBooleanFilters), [activeBooleanFilters])

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
    queryKey: ['leads', q, page, pageSize, dateRange ?? null, booleanFilterKey] as const,
    queryFn: async (): Promise<ApiResponse> => {
      const u = new URL('/api/v1/leads', window.location.origin)
      if (q) u.searchParams.set('q', q)
      u.searchParams.set('page', String(page))
      u.searchParams.set('pageSize', String(pageSize))
      if (dateRange) {
        u.searchParams.set('dateRange', dateRange)
      }
      for (const [key, value] of Object.entries(activeBooleanFilters)) {
        if (value) {
          u.searchParams.set(key, 'true')
        }
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
  const pageSizeFromData = data?.pageSize ?? pageSize

  // Dialog state
  const [dialog, setDialog] = React.useState<
    | { lead: Lead; mode: 'tickets' }
    | { lead: Lead; mode: 'sales' }
    | { lead: Lead; mode: 'messages' }
    | { lead: Lead; mode: 'audits' }
    | null
  >(null)
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = React.useState(false)

  const handleOpenDialog = React.useCallback((leadId: string, mode: 'tickets' | 'sales' | 'messages' | 'audits') => {
    const lead = items.find((l) => l.id === leadId)
    if (lead) {
      setDialog({ lead, mode })
    }
  }, [items])

  const handleCloseDialog = React.useCallback(() => {
    setDialog(null)
  }, [])

  // Desktop columns for ResponsiveDataTable
  const columns = React.useMemo<ColumnDef<Lead>[]>(
    () => [
      { header: 'Nome', accessorKey: 'name', cell: ({ getValue }) => getValue() || '-' },
      { header: 'Telefone', accessorKey: 'phone', cell: ({ getValue }) => getValue() || '-' },
      { header: 'Email', accessorKey: 'mail', cell: ({ getValue }) => getValue() || '-' },
      { header: 'Criado em', accessorKey: 'createdAt', cell: ({ getValue }) => new Date(getValue() as Date).toLocaleString('pt-BR') },
      { header: 'Tickets', accessorKey: 'hasTickets', cell: ({ getValue }) => (getValue() ? '✓' : '') },
      { header: 'Vendas', accessorKey: 'hasSales', cell: ({ getValue }) => (getValue() ? '✓' : '') },
      { header: 'Mensagens', accessorKey: 'hasMessages', cell: ({ getValue }) => (getValue() ? '✓' : '') },
      { header: 'Auditoria', accessorKey: 'hasAudit', cell: ({ getValue }) => (getValue() ? '✓' : '') },
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
    if (Object.values(activeBooleanFilters).some(Boolean)) count++
    return count
  }, [q, dateRange, activeBooleanFilters])

  // Clear all filters
  const handleClearAllFilters = React.useCallback(() => {
    updateQueryParams((params) => {
      params.delete('q')
      params.delete('dateRange')
      params.delete('hasTickets')
      params.delete('hasSales')
      params.delete('hasMessages')
      params.delete('hasAudit')
    })
  }, [updateQueryParams])

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <HeaderActions>
        <div className="flex items-center gap-2">
          {/* Mobile: Filters Button */}
          {!isDesktop && (
            <DataTableFiltersButton
              activeCount={activeFilterCount}
              onClick={() => setIsFiltersOpen(true)}
            />
          )}

          {/* Desktop: View Mode Toggle */}
          {isDesktop && (
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                title="Visualizar como tabela"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                title="Visualizar como cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </HeaderActions>

      {/* Desktop Filters Bar */}
      {isDesktop && (
        <FilterBar>
          <FilterBarSection title="Busca e Datas">
            <div className="flex gap-2">
              <FilterInput
                value={input}
                onChange={setInput}
                placeholder="Pesquisar leads..."
              />
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
            </div>
          </FilterBarSection>

          <FilterBarSection title="Status">
            <div className="grid grid-cols-2 gap-2">
              {BOOLEAN_FILTER_OPTIONS.map(({ key, label }) => (
                <FilterSwitch
                  key={key}
                  label={label}
                  checked={activeBooleanFilters[key]}
                  onChange={(checked) => {
                    updateQueryParams((params) => {
                      if (!checked) {
                        params.delete(key)
                      } else {
                        params.set(key, 'true')
                      }
                    })
                  }}
                />
              ))}
            </div>
          </FilterBarSection>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="text-xs text-muted-foreground">
                {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            </div>
          )}
        </FilterBar>
      )}

      {/* Mobile Filters Sheet */}
      <DataTableFiltersSheet
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        title="Filtros"
        onApply={() => setIsFiltersOpen(false)}
      >
        <FilterGroup label="Busca">
          <FilterInput
            value={input}
            onChange={setInput}
            placeholder="Pesquisar leads..."
          />
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

        <FilterGroup label="Status">
          {BOOLEAN_FILTER_OPTIONS.map(({ key, label }) => (
            <FilterSwitch
              key={key}
              label={label}
              checked={activeBooleanFilters[key]}
              onChange={(checked) => {
                updateQueryParams((params) => {
                  if (!checked) {
                    params.delete(key)
                  } else {
                    params.set(key, 'true')
                  }
                })
              }}
            />
          ))}
        </FilterGroup>
      </DataTableFiltersSheet>

      {/* Responsive Table */}
      <ResponsiveDataTable
        data={items}
        columns={columns}
        mobileCard={(row) => (
          <LeadCard
            lead={row.original}
            onOpenDialog={handleOpenDialog}
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

      {/* Dialogs */}
      {dialog && dialog.mode === 'tickets' && (
        <LeadTicketsDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          leadPhone={dialog.lead.phone}
          open={Boolean(dialog)}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleCloseDialog()
            }
          }}
        />
      )}

      {dialog && dialog.mode === 'sales' && (
        <LeadSalesDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          leadPhone={dialog.lead.phone}
          open={Boolean(dialog)}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleCloseDialog()
            }
          }}
        />
      )}

      {dialog && dialog.mode === 'messages' && (
        <LeadMessagesDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          leadPhone={dialog.lead.phone}
          open={Boolean(dialog)}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleCloseDialog()
            }
          }}
        />
      )}

      {dialog && dialog.mode === 'audits' && (
        <LeadAuditDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          leadPhone={dialog.lead.phone}
          open={Boolean(dialog)}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleCloseDialog()
            }
          }}
        />
      )}

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
