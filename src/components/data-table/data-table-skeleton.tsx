'use client'

import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DataTableSkeletonProps {
  rows?: number
  columns?: number
  isMobile?: boolean
  className?: string
}

/**
 * DataTableSkeleton - Loading skeleton for data tables
 *
 * Features:
 * - Desktop table skeleton
 * - Mobile card skeleton
 * - Customizable rows/columns
 */
export const DataTableSkeleton = React.forwardRef<
  HTMLDivElement,
  DataTableSkeletonProps
>(
  (
    { rows = 5, columns = 4, isMobile = false, className },
    ref
  ) => {
    if (isMobile) {
      return (
        <div ref={ref} className={cn('space-y-4', className)}>
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 bg-card p-4 space-y-3"
            >
              {/* Card header */}
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>

              {/* Card content */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              {/* Card footer */}
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div ref={ref} className={cn('rounded-md border', className)}>
        {/* Table header */}
        <div className="border-b bg-muted/50 p-4">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>

        {/* Table rows */}
        <div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="border-b p-4 last:border-0">
              <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
)

DataTableSkeleton.displayName = 'DataTableSkeleton'
