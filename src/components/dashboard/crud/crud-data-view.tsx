'use client'

import React from 'react'
import { Package } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/states/empty-state'
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
  action?: React.ReactNode
}

export function CrudEmptyState({
  title = 'Nenhum registro encontrado.',
  description = 'Tente buscar por termos diferentes ou verifique os filtros.',
  action,
}: CrudEmptyStateProps) {
  return (
    <EmptyState
      icon={Package}
      title={title}
      description={description}
      action={action}
    />
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
