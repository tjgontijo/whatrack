'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ColumnDef, RowActions } from './types'

interface CrudListViewProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  rowActions?: RowActions<T>
  onRowClick?: (item: T) => void
  className?: string
  getRowKey?: (item: T, index: number) => string
}

export function CrudListView<T>({
  data,
  columns,
  rowActions,
  onRowClick,
  className,
  getRowKey = (_, index) => index.toString()
}: CrudListViewProps<T>) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden shadow-sm", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide",
                    column.headerClassName
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </th>
              ))}
              {rowActions && <th className="w-24"></th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={getRowKey(item, index)}
                className={cn(
                  "group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-4 py-3", column.className)}
                  >
                    {column.render(item, index)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {rowActions.customActions?.(item)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
