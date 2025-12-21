'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface FilterGroupProps {
  label?: string
  children: React.ReactNode
  className?: string
}

/**
 * FilterGroup - Container for grouping related filters
 *
 * Features:
 * - Optional label for visual grouping
 * - Responsive spacing
 */
export const FilterGroup = React.forwardRef<HTMLDivElement, FilterGroupProps>(
  ({ label, children, className }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        {label && (
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
        )}
        <div className="space-y-2">
          {children}
        </div>
      </div>
    )
  }
)

FilterGroup.displayName = 'FilterGroup'
