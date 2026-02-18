'use client'

import React from 'react'
import { TableVirtuoso } from 'react-virtuoso'
import { cn } from '@/lib/utils'
import { ColumnDef, RowActions } from './types'

interface CrudListViewProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  rowActions?: RowActions<T>
  onRowClick?: (item: T) => void
  className?: string
  onEndReached?: () => void
}

export function CrudListView<T>({
  data,
  columns,
  rowActions,
  onRowClick,
  className,
  onEndReached,
}: CrudListViewProps<T>) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-sm mx-6 my-4', className)}>
      <TableVirtuoso
        data={data}
        style={{ height: '100%', minHeight: 200 }}
        endReached={onEndReached}
        overscan={10}
        components={{
          Table: ({ style, ...props }) => (
            <table className="w-full" style={style} {...props} />
          ),
          TableHead: React.forwardRef(({ style, ...props }, ref) => (
            <thead ref={ref} style={style} {...props} />
          )),
          TableRow: ({ style, item: _item, ...props }) => (
            <tr
              className={cn(
                'group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              style={style}
              {...props}
            />
          ),
          TableBody: React.forwardRef(({ style, ...props }, ref) => (
            <tbody ref={ref} style={style} {...props} />
          )),
          ScrollSeekPlaceholder: ({ height }) => (
            <tr style={{ height }}>
              <td colSpan={columns.length + (rowActions ? 1 : 0)}>
                <div className="h-full bg-muted/20 animate-pulse" />
              </td>
            </tr>
          ),
        }}
        fixedHeaderContent={() => (
          <tr className="bg-muted/30 border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30',
                  column.headerClassName
                )}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.label}
              </th>
            ))}
            {rowActions && <th className="w-24 bg-muted/30" />}
          </tr>
        )}
        itemContent={(index, item) => (
          <>
            {columns.map((column) => (
              <td
                key={column.key}
                className={cn('px-4 py-3', column.className)}
                onClick={() => onRowClick?.(item)}
              >
                {column.render(item, index)}
              </td>
            ))}
            {rowActions && (
              <td
                className="px-4 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {rowActions.customActions?.(item)}
                </div>
              </td>
            )}
          </>
        )}
      />
    </div>
  )
}
