/**
 * Shared types for data-table components
 */

export interface DataTablePaginationState {
  page: number
  pageSize: number
  total: number
}

export interface DataTableCallbacks {
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}
