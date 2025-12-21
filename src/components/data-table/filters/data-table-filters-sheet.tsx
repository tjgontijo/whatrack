'use client'

import * as React from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DataTableFiltersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
  onApply?: () => void
  showApplyButton?: boolean
  className?: string
}

/**
 * DataTableFiltersSheet - Mobile filter drawer
 *
 * Features:
 * - Bottom slide-up drawer
 * - Optional apply button
 * - Scrollable content
 * - Safe area handling for iOS notch
 */
export const DataTableFiltersSheet = React.forwardRef<
  HTMLDivElement,
  DataTableFiltersSheetProps
>(
  (
    {
      open,
      onOpenChange,
      children,
      title = 'Filtros',
      description,
      onApply,
      showApplyButton = true,
      className,
    },
    ref
  ) => {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          ref={ref}
          side="bottom"
          className={cn(
            'h-auto max-h-[85vh] overflow-y-auto',
            'px-4 py-6 pb-safe-bottom',
            className
          )}
        >
          <SheetHeader className="mb-6">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>

          <div className="space-y-6">
            {children}

            {showApplyButton && (
              <Button
                onClick={() => {
                  onApply?.()
                  onOpenChange(false)
                }}
                className="w-full"
              >
                Aplicar Filtros
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    )
  }
)

DataTableFiltersSheet.displayName = 'DataTableFiltersSheet'
