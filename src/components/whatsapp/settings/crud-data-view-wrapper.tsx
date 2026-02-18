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
    emptyState
}: CrudDataViewProps<T>) {
    // Empty state
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed text-center px-10 mx-6">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-base font-semibold text-muted-foreground mb-2">
                    {emptyState?.title || 'Nenhum registro encontrado'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    {emptyState?.description || 'Tente buscar por termos diferentes ou verifique os filtros.'}
                </p>
                {emptyState?.action && (
                    <Button
                        variant="default"
                        onClick={emptyState.action.onClick}
                    >
                        {emptyState.action.label}
                    </Button>
                )}
            </div>
        )
    }

    // Render based on view type
    return (
        <div className="animate-in fade-in duration-500 px-6 pt-10 pb-10">
            {view === 'list' ? (
                <CrudListView
                    data={data}
                    columns={columns}
                    rowActions={rowActions}
                    onRowClick={cardConfig.onClick}
                />
            ) : (
                <CrudCardView
                    data={data}
                    config={cardConfig}
                    rowActions={rowActions}
                />
            )}
        </div>
    )
}
