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

export function CrudDataView<T>({
  data,
  view,
  tableView,
  cardView,
  kanbanView,
  emptyView,
}: CrudDataViewProps<T>) {
  if (data.length === 0 && view !== 'kanban') {
    return (
      emptyView || (
        <div className="bg-muted/20 mx-6 my-4 flex flex-col items-center justify-center rounded-3xl border border-dashed px-10 py-20 text-center">
          <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-xl">
            <Package className="text-muted-foreground size-6" />
          </div>
          <p className="text-muted-foreground font-bold">Nenhum registro encontrado.</p>
          <p className="text-muted-foreground/60 mt-1 text-xs">
            Tente buscar por termos diferentes ou verifique os filtros.
          </p>
        </div>
      )
    )
  }

  return (
    <div className="animate-in fade-in h-full duration-300">
      {view === 'kanban' ? kanbanView : view === 'list' ? tableView : cardView}
    </div>
  )
}
