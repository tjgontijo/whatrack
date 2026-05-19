'use client'

import { SlidersHorizontal } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CrudDataView, CrudEmptyState } from '@/features/dashboard/components/crud/crud-data-view'
import { CrudListView } from '@/features/dashboard/components/crud/crud-list-view'
import type { ViewType } from '@/features/dashboard/components/crud/types'
import { ViewSwitcher } from '@/features/dashboard/components/crud/view-switcher'
import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { EditStagesModal } from '@/features/deal-stage-templates/dialogs/edit-stages-modal'
import { DealsFilters } from '@/features/deals/components/filters/deals-filters'
import { DealsKanbanBoard } from '@/features/deals/components/kanban/deals-kanban-board'
import { dealColumns } from '@/features/deals/components/list/deals-view-config'
import { DEALS_QUERY_KEY } from '@/features/deals/constants'
import { DealDetailsDialog } from '@/features/deals/components/dialogs/deal-details-dialog'
import { useReorderDealMutation } from '@/features/deals/mutations/use-reorder-deal-mutation'
import { useDealStagesQuery } from '@/features/deals/queries/use-deal-stages-query'
import type {
  DealDateRangeFilter,
  DealItem,
  DealStats,
  DealStatusFilter,
} from '@/features/deals/types'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'

export function DealsScreen() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()
  const [view, setView] = useState<ViewType>('kanban')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<DealStatusFilter>('all')
  const [dateRange, setDateRange] = useState<DealDateRangeFilter>('all')
  const [funnelOpen, setFunnelOpen] = useState(false)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

  const deferredSearch = React.useDeferredValue(searchInput)

  const filters = useMemo(() => {
    const search = deferredSearch.trim()
    const hasSearch = search.length >= 3

    return {
      ...(hasSearch ? { q: search } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(dateRange !== 'all' ? { dateRange } : {}),
    }
  }, [dateRange, deferredSearch, statusFilter])

  const {
    data: deals,
    stats,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useCrudInfiniteQuery<DealItem>({
    queryKey: [...DEALS_QUERY_KEY],
    endpoint: '/api/v1/deals',
    pageSize: view === 'kanban' ? 500 : 30,
    filters,
  })

  const { data: stagesData } = useDealStagesQuery({
    organizationId,
    projectId,
    enabled: view === 'kanban',
  })
  const reorderDealMutation = useReorderDealMutation({ organizationId, projectId })
  const dealStats = stats as DealStats | undefined

  return (
    <>
      <HeaderPageShell
        title='Negociações'
        selector={
          <ViewSwitcher view={view} setView={setView} enabledViews={['kanban', 'list']} />
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder='Buscar por nome, telefone...'
        onRefresh={() => void refetch()}
        isFetchingMore={isFetchingNextPage}
        filters={
          <DealsFilters
            statusFilter={statusFilter}
            dateRange={dateRange}
            onStatusFilterChange={setStatusFilter}
            onDateRangeChange={setDateRange}
          />
        }
        isLoading={isLoading}
        bodyClassName='overflow-hidden h-full flex flex-col'
        contentClassName={
          view === 'kanban' ? 'h-full flex-1 p-0 flex flex-col' : 'h-full flex-1 px-6 py-4 flex flex-col'
        }
        actions={
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 gap-1.5 text-xs'
            onClick={() => setFunnelOpen(true)}
          >
            <SlidersHorizontal className='h-3.5 w-3.5' />
            Configurar funil
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
              columns={dealColumns}
              onRowClick={(deal) => setSelectedDealId(deal.id)}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
          kanbanView={
            <DealsKanbanBoard
              columns={stagesData?.items ?? []}
              deals={deals}
              stageStats={dealStats?.stageStats ?? {}}
              organizationId={organizationId}
              projectId={projectId}
              onReorderDeal={(dealId, stageId, position) =>
                reorderDealMutation.mutate({ dealId, stageId, position })
              }
              onConfigStage={() => setFunnelOpen(true)}
              onDealClick={(deal) => setSelectedDealId(deal.id)}
            />
          }
        />
      </HeaderPageShell>
      <EditStagesModal
        open={funnelOpen}
        onOpenChange={setFunnelOpen}
        projectId={projectId}
        organizationId={organizationId}
        currentStages={stagesData?.items ?? []}
      />
      <DealDetailsDialog
        dealId={selectedDealId}
        open={!!selectedDealId}
        onOpenChange={(open) => !open && setSelectedDealId(null)}
        organizationId={organizationId}
        projectId={projectId}
      />
    </>
  )
}
