'use client'

import * as React from 'react'
import { flexRender, Header, Row } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

interface DataTableViewProps<TData> {
  headers: Header<TData, unknown>[]
  rows: Row<TData>[]
  className?: string
}

/**
 * DataTableView - Desktop table view using TanStack Table
 *
 * Features:
 * - Responsive HTML table
 * - Header and row rendering
 * - Clean, minimal styling
 */
export const DataTableView = React.forwardRef<HTMLDivElement, DataTableViewProps<any>>(
  ({ headers, rows, className }, ref) => {
    return (
      <div ref={ref} className={cn('rounded-md border', className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 hover:bg-muted/50">
              {headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {header.isPlaceholder ? null : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center">
                  <div className="text-muted-foreground">Nenhum resultado</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }
)

DataTableView.displayName = 'DataTableView'
