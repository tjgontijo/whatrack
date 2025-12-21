'use client'

import { useMemo } from 'react'
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table'

interface UseDataTableOptions<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  pagination?: {
    page: number
    pageSize: number
    total: number
  }
  onPaginationChange?: (state: { page: number; pageSize: number }) => void
}

interface UseDataTableReturn<TData> {
  table: ReturnType<typeof useReactTable<TData>>
  rows: TData[]
}

/**
 * useDataTable - Integration with TanStack Table (React Table)
 *
 * Features:
 * - TanStack Table instance creation
 * - Pagination support
 * - Manual pagination mode
 * - Server-side data handling
 *
 * @example
 * const { table, rows } = useDataTable({
 *   data: items,
 *   columns: leadColumns,
 *   pagination: { page, pageSize, total },
 *   onPaginationChange: handlePaginationChange
 * })
 */
export function useDataTable<TData extends Record<string, any>>(
  options: UseDataTableOptions<TData>
): UseDataTableReturn<TData> {
  const {
    data,
    columns,
    pagination,
    onPaginationChange,
  } = options

  // Calculate pagination state
  const paginationState = useMemo(() => {
    if (!pagination) return undefined

    return {
      pageIndex: pagination.page - 1,
      pageSize: pagination.pageSize,
    }
  }, [pagination])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: !!pagination,
    pageCount: pagination
      ? Math.ceil(pagination.total / pagination.pageSize)
      : undefined,
    state: pagination
      ? {
          pagination: paginationState!,
        }
      : undefined,
    onPaginationChange: pagination
      ? (updater) => {
          const newState =
            typeof updater === 'function'
              ? updater(paginationState!)
              : updater

          onPaginationChange?.({
            page: newState.pageIndex + 1,
            pageSize: newState.pageSize,
          })
        }
      : undefined,
  })

  const rows = table.getRowModel().rows

  return {
    table,
    rows: rows.map((row) => row.original),
  }
}
