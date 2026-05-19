'use client'

import { Package } from 'lucide-react'
import type React from 'react'
import { EmptyState } from '@/features/dashboard/components/states/empty-state'
import type { ViewType } from './types'

interface CrudDataViewProps<T> {
  data: T[]
  view: ViewType
  tableView: React.ReactNode
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
  return <EmptyState icon={Package} title={title} description={description} action={action} />
}

export function CrudDataView<T>({
  data,
  view,
  tableView,
  kanbanView,
  emptyView,
}: CrudDataViewProps<T>) {
  if (data.length === 0 && view !== 'kanban') {
    return emptyView || <CrudEmptyState />
  }

  return (
    <div className='fade-in h-full flex-1 min-h-0 animate-in duration-300'>
      {view === 'kanban' ? kanbanView : tableView}
    </div>
  )
}
