'use client'

import React from 'react'
import { ViewType } from './types'

interface CrudDataViewProps<T> {
    data: T[]
    view: ViewType
    tableView: React.ReactNode
    cardView: React.ReactNode
    emptyView?: React.ReactNode
}

export function CrudDataView<T>({
    data,
    view,
    tableView,
    cardView,
    emptyView
}: CrudDataViewProps<T>) {
    if (data.length === 0) {
        return emptyView || (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed text-center px-10">
                <p className="font-bold text-muted-foreground">Nenhum registro encontrado.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tente buscar por termos diferentes ou verifique os filtros.</p>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-500">
            {view === 'list' ? tableView : cardView}
        </div>
    )
}
