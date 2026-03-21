'use client'

import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ViewType, ColumnDef, CardConfig, RowActions } from '@/components/dashboard/crud/types'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'

interface CrudDataViewProps<T> {
  view: ViewType
  data: T[]
  columns: ColumnDef<T>[]
  cardConfig: CardConfig<T>
  rowActions?: RowActions<T>
  getRowKey?: (item: T, index: number) => string
  emptyState?: {
    title: string
    description: string
    action?: {
      label: string
      onClick: () => void
    }
  }
}

export function CrudDataView<T>({
  view,
  data,
  columns,
  cardConfig,
  rowActions,
  emptyState,
}: CrudDataViewProps<T>) {
  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center text-center">
        <div className="space-y-3">
          <FileText className="text-muted-foreground/30 mx-auto mb-1 h-8 w-8" />
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              {emptyState?.title || 'Nenhum registro encontrado'}
            </p>
            <p className="text-muted-foreground/50 mt-1 text-xs">
              {emptyState?.description || 'Tente buscar por termos diferentes ou verifique os filtros.'}
            </p>
          </div>
          {emptyState?.action && (
            <Button size="sm" onClick={emptyState.action.onClick}>
              {emptyState.action.label}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render based on view type
  return (
    <div className="animate-in fade-in px-6 pb-10 pt-10 duration-500">
      {view === 'list' ? (
        <CrudListView
          data={data}
          columns={columns}
          rowActions={rowActions}
          onRowClick={cardConfig.onClick}
        />
      ) : (
        <CrudCardView data={data} config={cardConfig} rowActions={rowActions} />
      )}
    </div>
  )
}
