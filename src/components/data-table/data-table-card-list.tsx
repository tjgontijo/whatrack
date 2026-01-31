'use client'

import * as React from 'react'
import { Row } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

interface DataTableCardListProps<TData> {
  rows: Row<TData>[]
  renderCard: (row: Row<TData>) => React.ReactNode
  className?: string
}

/**
 * DataTableCardList - Mobile card list view
 *
 * Features:
 * - Renders rows as cards using renderCard callback
 * - Responsive spacing
 * - Empty state handling
 */
export const DataTableCardList = React.forwardRef<
  HTMLDivElement,
  DataTableCardListProps<any>
>(({ rows, renderCard, className }, ref) => {
  if (rows.length === 0) {
    return (
      <div ref={ref} className={cn('text-center py-8', className)}>
        <div className="text-muted-foreground text-sm">Nenhum resultado</div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3',
        className
      )}
      role="list"
    >
      {rows.map((row) => (
        <div key={row.id} role="listitem">
          {renderCard(row)}
        </div>
      ))}
    </div>
  )
})

DataTableCardList.displayName = 'DataTableCardList'
