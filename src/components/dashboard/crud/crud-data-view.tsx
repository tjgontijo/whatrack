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
    <div className="mx-6 my-4 flex min-h-[calc(100vh-280px)] items-center justify-center rounded-3xl border border-dashed bg-muted/20 px-10 py-20 text-center">
      <div>
        <div className="bg-muted mx-auto mb-3 flex size-12 items-center justify-center rounded-xl">
          <Package className="text-muted-foreground size-6" />
        </div>
        <p className="text-muted-foreground font-bold">{title}</p>
        <p className="text-muted-foreground/60 mt-1 text-xs">{description}</p>
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
