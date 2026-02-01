import React from 'react'

// View types
export type ViewType = 'list' | 'cards' | 'kanban'

// Pagination configuration
export interface PaginationConfig {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasMore: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// Search configuration
export interface SearchConfig {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

// Column definition for generic views
export interface ColumnDef<T> {
  key: string
  label: string
  width?: string | number
  className?: string
  headerClassName?: string
  render: (item: T, index: number) => React.ReactNode
  sortable?: boolean
}

// Card configuration for generic card view
export interface CardConfig<T> {
  icon?: (item: T) => React.ReactNode
  title: (item: T) => React.ReactNode
  subtitle?: (item: T) => React.ReactNode
  badge?: (item: T) => React.ReactNode
  footer?: (item: T) => React.ReactNode
  onClick?: (item: T) => void
  actions?: (item: T) => React.ReactNode
}

// Row actions for generic views
export interface RowActions<T> {
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  customActions?: (item: T) => React.ReactNode
}
