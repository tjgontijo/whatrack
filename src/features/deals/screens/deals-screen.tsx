'use client'

import { SlidersHorizontal } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CrudCardView } from '@/features/dashboard/components/crud/crud-card-view'
import { CrudDataView, CrudEmptyState } from '@/features/dashboard/components/crud/crud-data-view'
import { CrudListView } from '@/features/dashboard/components/crud/crud-list-view'
import type { ViewType } from '@/features/dashboard/components/crud/types'
import { ViewSwitcher } from '@/features/dashboard/components/crud/view-switcher'
import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { EditStagesModal } from '@/features/deal-stage-templates/dialogs/edit-stages-modal'
import { DealsFilters } from '@/features/deals/components/filters/deals-filters'
import { DealsKanbanBoard } from '@/features/deals/components/kanban/deals-kanban-board'
import { dealCardConfig, dealColumns } from '@/features/deals/components/list/deals-view-config'
import { DEALS_QUERY_KEY } from '@/features/deals/constants'
import { useMoveDealMutation } from '@/features/deals/mutations/use-move-deal-mutation'
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
    pageSize: 30,
    filters,
  })

  const { data: stagesData } = useDealStagesQuery({
    organizationId,
    projectId,
    enabled: view === 'kanban',
  })
  const moveDealMutation = useMoveDealMutation({ organizationId, projectId })
  const dealStats = stats as DealStats | undefined

  return (
    <>
      <HeaderPageShell
        title='Negociações'
        selector={
          <ViewSwitcher view={view} setView={setView} enabledViews={['kanban', 'list', 'cards']} />
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
        bodyClassName={view === 'kanban' ? 'overflow-hidden h-full flex flex-col' : undefined}
        contentClassName={
          view === 'kanban' ? 'h-full flex-1 p-0 px-0 py-0 flex flex-col' : undefined
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
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
          cardView={
            <CrudCardView
              data={deals}
              config={dealCardConfig}
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
              onMoveDeal={(dealId, stageId) => moveDealMutation.mutate({ dealId, stageId })}
              onConfigStage={() => setFunnelOpen(true)}
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
    </>
  )
}
