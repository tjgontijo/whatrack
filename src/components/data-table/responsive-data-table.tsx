'use client'

import * as React from 'react'
import { ColumnDef, Row } from '@tanstack/react-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { useDataTable } from '@/hooks/use-data-table'
import { DataTableView } from './data-table-view'
import { DataTableCardList } from './data-table-card-list'
import { DataTablePagination } from './data-table-pagination'
import { DataTableSkeleton } from './data-table-skeleton'
import { DataTableEmptyState, DataTableErrorState } from './data-table-empty-state'
import { cn } from '@/lib/utils'

interface ResponsiveDataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  isLoading?: boolean
  isError?: boolean
  error?: Error
  mobileCard: (row: Row<TData>) => React.ReactNode
  pagination: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  emptyState?: React.ReactNode
  errorState?: React.ReactNode
  className?: string
  tableClassName?: string
  paginationClassName?: string
  forceCardView?: boolean
}

/**
 * ResponsiveDataTable - Main responsive table component
 *
 * Features:
 * - Automatic desktop/mobile switching
 * - Supports cards on mobile, table on desktop
 * - Loading and error states
 * - Pagination with customizable page size
 * - TanStack Table integration
 *
 * @example
 * <ResponsiveDataTable
 *   data={leads}
 *   columns={columns}
 *   mobileCard={(row) => <LeadCard item={row.original} />}
 *   pagination={{ page, pageSize, total, onPageChange, onPageSizeChange }}
 *   isLoading={isLoading}
 * />
 */
export const ResponsiveDataTable = React.forwardRef<
  HTMLDivElement,
  ResponsiveDataTableProps<any>
>(
  (
    {
      data,
      columns,
      isLoading = false,
      isError = false,
      error,
      mobileCard,
      pagination,
      emptyState,
      errorState,
      className,
      tableClassName,
      paginationClassName,
      forceCardView = false,
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const showCards = isMobile || forceCardView
    const { table } = useDataTable({
      data,
      columns,
      pagination,
      onPaginationChange: (state) => {
        pagination.onPageChange(state.page)
        pagination.onPageSizeChange(state.pageSize)
      },
    })

    const rows = table.getRowModel().rows

    // Loading state
    if (isLoading) {
      return (
        <div ref={ref} className={className}>
          <DataTableSkeleton isMobile={showCards} rows={5} className={tableClassName} />
        </div>
      )
    }

    // Error state
    if (isError) {
      return (
        <div ref={ref} className={className}>
          {errorState || (
            <DataTableErrorState
              description={
                error?.message || 'Ocorreu um erro ao carregar os dados. Tente novamente.'
              }
              className={tableClassName}
            />
          )}
        </div>
      )
    }

    // Empty state
    if (data.length === 0) {
      return (
        <div ref={ref} className={className}>
          {emptyState || (
            <DataTableEmptyState className={tableClassName} />
          )}
        </div>
      )
    }

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {/* Mobile/Card view */}
        {showCards && (
          <DataTableCardList
            rows={rows}
            renderCard={mobileCard}
            className={tableClassName}
          />
        )}

        {/* Desktop/Table view */}
        {!showCards && (
          <DataTableView
            headers={table.getHeaderGroups()[0]?.headers ?? []}
            rows={rows}
            className={tableClassName}
          />
        )}

        {/* Pagination */}
        <DataTablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          className={paginationClassName}
        />
      </div>
    )
  }
)

ResponsiveDataTable.displayName = 'ResponsiveDataTable'
