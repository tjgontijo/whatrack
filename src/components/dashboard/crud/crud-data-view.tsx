'use client'

import React from 'react'
import { Package } from 'lucide-react'
import { ViewType } from './types'

interface CrudDataViewProps<T> {
  data: T[]
  view: ViewType
  tableView: React.ReactNode
  cardView: React.ReactNode
  kanbanView?: React.ReactNode
  emptyView?: React.ReactNode
}

type CrudEmptyStateProps = {
  title?: string
  description?: string
}

export function CrudEmptyState({
  title = 'Nenhum registro encontrado.',
  description = 'Tente buscar por termos diferentes ou verifique os filtros.',
}: CrudEmptyStateProps) {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center text-center">
      <div>
        <Package className="text-muted-foreground/30 mx-auto mb-3 size-8" />
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground/50 mt-1 text-xs">{description}</p>
      </div>
    </div>
  )
}

export function CrudDataView<T>({
  data,
  view,
  tableView,
  cardView,
  kanbanView,
  emptyView,
}: CrudDataViewProps<T>) {
  if (data.length === 0 && view !== 'kanban') {
    return emptyView || <CrudEmptyState />
  }

  return (
    <div className="animate-in fade-in h-full duration-300">
      {view === 'kanban' ? kanbanView : view === 'list' ? tableView : cardView}
    </div>
  )
}
