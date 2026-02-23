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
      <div className="bg-muted/20 mx-6 flex flex-col items-center justify-center rounded-3xl border border-dashed px-10 py-20 text-center">
        <FileText className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
        <h3 className="text-muted-foreground mb-2 text-base font-semibold">
          {emptyState?.title || 'Nenhum registro encontrado'}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {emptyState?.description || 'Tente buscar por termos diferentes ou verifique os filtros.'}
        </p>
        {emptyState?.action && (
          <Button variant="default" onClick={emptyState.action.onClick}>
            {emptyState.action.label}
          </Button>
        )}
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
