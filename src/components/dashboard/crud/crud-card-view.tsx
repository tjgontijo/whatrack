'use client'

import { VirtuosoGrid } from 'react-virtuoso'
import { cn } from '@/lib/utils'
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
        'grid gap-3 p-4',
        gridClassName ?? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      itemContent={(index, item) => (
        <div
          key={getRowKey(item, index)}
          className={cn(
            'group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-md',
            config.onClick && 'cursor-pointer',
            cardClassName
          )}
          onClick={() => config.onClick?.(item)}
        >
          {/* Card Content */}
          <div className="flex p-3 gap-3">
            {config.icon && (
              <div className="relative w-16 shrink-0">
                <div className="aspect-square w-full bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-center">
                  {config.icon(item)}
                </div>
              </div>
            )}

            <div className={cn('flex-1 min-w-0', rowActions && 'pr-8')}>
              <h3 className="font-semibold text-sm text-foreground truncate leading-tight mb-1">
                {config.title(item)}
              </h3>
              {config.subtitle && (
                <div className="flex items-center gap-1.5">
                  {config.subtitle(item)}
                </div>
              )}
            </div>

            {rowActions && (
              <div
                className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {rowActions.customActions?.(item)}
              </div>
            )}
          </div>

          {(config.footer || config.badge) && (
            <div className="border-t border-border/50 px-3 py-2 bg-muted/5 flex items-center justify-between">
              {config.badge?.(item)}
              {config.footer?.(item)}
            </div>
          )}
        </div>
      )}
    />
  )
}
