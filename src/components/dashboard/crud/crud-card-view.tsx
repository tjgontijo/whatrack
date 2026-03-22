'use client'

import { VirtuosoGrid } from 'react-virtuoso'
import { cn } from '@/lib/utils/utils'
import { CardConfig, RowActions } from './types'

interface CrudCardViewProps<T> {
  data: T[]
  config: CardConfig<T>
  rowActions?: RowActions<T>
  className?: string
  cardClassName?: string
  /**
   * Tailwind classes for the grid container.
   * Default: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
   */
  gridClassName?: string
  getRowKey?: (item: T, index: number) => string
  onEndReached?: () => void
}

export function CrudCardView<T>({
  data,
  config,
  rowActions,
  className,
  cardClassName,
  gridClassName,
  getRowKey = (_, index) => index.toString(),
  onEndReached,
}: CrudCardViewProps<T>) {
  return (
    <VirtuosoGrid
      data={data}
      endReached={onEndReached}
      overscan={200}
      style={{ height: '100%', minHeight: 200 }}
      listClassName={cn(
        'grid gap-3',
        gridClassName ?? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6',
        className
      )}
      itemContent={(index, item) => (
        <div
          key={getRowKey(item, index)}
          className={cn(
            'border-border bg-card group relative overflow-hidden rounded-md border transition-colors hover:bg-muted/20',
            config.onClick && 'cursor-pointer',
            cardClassName
          )}
          onClick={() => config.onClick?.(item)}
        >
          {/* Row actions — top-right, visible on hover */}
          {rowActions && (
            <div
              className="absolute right-2 top-2 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {rowActions.customActions?.(item)}
            </div>
          )}

          {/* Card body */}
          <div className={cn('flex gap-3 p-3', rowActions && 'pr-10')}>
            {config.icon && (
              <div className="text-muted-foreground/60 mt-0.5 shrink-0">
                {config.icon(item)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="text-foreground truncate text-sm font-medium leading-tight">
                {config.title(item)}
              </h3>
              {config.subtitle && (
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                  {config.subtitle(item)}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {(config.footer || config.badge) && (
            <div className="border-border/40 flex items-center justify-between border-t px-3 py-2">
              <div className="flex items-center gap-1.5">{config.badge?.(item)}</div>
              <div className="text-muted-foreground text-xs">{config.footer?.(item)}</div>
            </div>
          )}
        </div>
      )}
    />
  )
}
