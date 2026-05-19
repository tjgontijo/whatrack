import type React from 'react'

// View types
export type ViewType = 'list' | 'kanban'

// Kanban column
export interface KanbanColumn {
  id: string
  name: string
  color: string
  order: number
  // Optional metadata for advanced headers
  dealsCount?: number
  isDefault?: boolean
  isClosed?: boolean
  statusGroup?: string
  probability?: number
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

// Row actions for generic views
export interface RowActions<T> {
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  customActions?: (item: T) => React.ReactNode
}
