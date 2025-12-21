'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  children: React.ReactNode
  onClearAll?: () => void
  showClearButton?: boolean
  className?: string
}

/**
 * FilterBar - Desktop filter container with organized layout
 *
 * Features:
 * - Clear all button (optional)
 * - Visual separator between filter groups
 * - Responsive grid layout
 * - Badge for active filter count (via slot)
 */
export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  (
    { children, onClearAll, showClearButton = false, className },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border/50 bg-card p-4 shadow-sm',
          'space-y-4',
          className
        )}
      >
        {children}

        {showClearButton && onClearAll && (
          <>
            <Separator />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-xs"
              >
                Limpar filtros
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }
)

FilterBar.displayName = 'FilterBar'

/**
 * FilterBarSection - Section within FilterBar for grouping related filters
 *
 * Features:
 * - Grid layout for multiple filters
 * - Optional title
 */
interface FilterBarSectionProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export const FilterBarSection = React.forwardRef<HTMLDivElement, FilterBarSectionProps>(
  ({ children, title, className }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        {title && (
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </h3>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {children}
        </div>
      </div>
    )
  }
)

FilterBarSection.displayName = 'FilterBarSection'
