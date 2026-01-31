'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableFiltersButtonProps {
  activeCount?: number
  onClick?: () => void
  className?: string
}

/**
 * DataTableFiltersButton - Mobile filter trigger button
 *
 * Features:
 * - Shows active filter count as badge
 * - Opens filter sheet on click
 * - Accessible with proper ARIA labels
 */
export const DataTableFiltersButton = React.forwardRef<
  HTMLButtonElement,
  DataTableFiltersButtonProps
>(
  (
    { activeCount = 0, onClick, className },
    ref
  ) => {
    return (
      <div className="relative">
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={className}
          aria-label="Abrir filtros"
          aria-expanded="false"
          aria-controls="filter-sheet"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>

        {activeCount > 0 && (
          <Badge
            variant="default"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            aria-label={`${activeCount} filtros ativos`}
          >
            {activeCount}
          </Badge>
        )}
      </div>
    )
  }
)

DataTableFiltersButton.displayName = 'DataTableFiltersButton'
