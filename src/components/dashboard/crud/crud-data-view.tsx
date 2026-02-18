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
        return emptyView || (
            <div className="flex flex-col items-center justify-center py-20 mx-6 my-4 bg-muted/20 rounded-3xl border border-dashed text-center px-10">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted mb-3">
                    <Package className="size-6 text-muted-foreground" />
                </div>
                <p className="font-bold text-muted-foreground">Nenhum registro encontrado.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tente buscar por termos diferentes ou verifique os filtros.</p>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-300 h-full">
            {view === 'kanban' ? kanbanView : view === 'list' ? tableView : cardView}
        </div>
    )
}
