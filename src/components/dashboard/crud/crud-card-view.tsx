'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { CardConfig, RowActions } from './types'

interface CrudCardViewProps<T> {
  data: T[]
  config: CardConfig<T>
  rowActions?: RowActions<T>
  className?: string
  cardClassName?: string
  gridCols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  getRowKey?: (item: T, index: number) => string
}

export function CrudCardView<T>({
  data,
  config,
  rowActions,
  className,
  cardClassName,
  gridCols = {
    default: 1,
    sm: 2,
    lg: 3,
    xl: 4
  },
  getRowKey = (_, index) => index.toString()
}: CrudCardViewProps<T>) {
  const gridClass = cn(
    "grid gap-3",
    gridCols.default === 1 && "grid-cols-1",
    gridCols.default === 2 && "grid-cols-2",
    gridCols.default === 3 && "grid-cols-3",
    gridCols.default === 4 && "grid-cols-4",
    gridCols.sm === 1 && "sm:grid-cols-1",
    gridCols.sm === 2 && "sm:grid-cols-2",
    gridCols.sm === 3 && "sm:grid-cols-3",
    gridCols.sm === 4 && "sm:grid-cols-4",
    gridCols.md === 1 && "md:grid-cols-1",
    gridCols.md === 2 && "md:grid-cols-2",
    gridCols.md === 3 && "md:grid-cols-3",
    gridCols.md === 4 && "md:grid-cols-4",
    gridCols.lg === 1 && "lg:grid-cols-1",
    gridCols.lg === 2 && "lg:grid-cols-2",
    gridCols.lg === 3 && "lg:grid-cols-3",
    gridCols.lg === 4 && "lg:grid-cols-4",
    gridCols.xl === 1 && "xl:grid-cols-1",
    gridCols.xl === 2 && "xl:grid-cols-2",
    gridCols.xl === 3 && "xl:grid-cols-3",
    gridCols.xl === 4 && "xl:grid-cols-4",
    className
  )

  return (
    <div className={gridClass}>
      {data.map((item, index) => (
        <div
          key={getRowKey(item, index)}
          className={cn(
            "group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-md",
            config.onClick && "cursor-pointer",
            cardClassName
          )}
          onClick={() => config.onClick?.(item)}
        >
          {/* Card Content */}
          <div className="flex p-3 gap-3">
            {/* Icon */}
            {config.icon && (
              <div className="relative w-16 shrink-0">
                <div className="aspect-square w-full bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-center">
                  {config.icon(item)}
                </div>
              </div>
            )}

            {/* Content */}
            <div className={cn("flex-1 min-w-0", rowActions && "pr-8")}>
              {/* Title */}
              <h3 className="font-semibold text-sm text-foreground truncate leading-tight mb-1">
                {config.title(item)}
              </h3>

              {/* Subtitle */}
              {config.subtitle && (
                <div className="flex items-center gap-1.5">
                  {config.subtitle(item)}
                </div>
              )}
            </div>

            {/* Actions */}
            {rowActions && (
              <div
                className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {rowActions.customActions?.(item)}
              </div>
            )}
          </div>

          {/* Footer */}
          {(config.footer || config.badge) && (
            <div className="border-t border-border/50 px-3 py-2 bg-muted/5 flex items-center justify-between">
              {config.badge && config.badge(item)}
              {config.footer && config.footer(item)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
