'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
  className?: string
}

/**
 * DataTablePagination - Responsive pagination component
 *
 * Features:
 * - Previous/Next navigation
 * - Page size selector
 * - Current page info
 * - Responsive layout
 */
export const DataTablePagination = React.forwardRef<
  HTMLDivElement,
  DataTablePaginationProps
>(
  (
    {
      page,
      pageSize,
      total,
      onPageChange,
      onPageSizeChange,
      pageSizeOptions = [10, 20, 30, 50, 100],
      className,
    },
    ref
  ) => {
    const pageCount = Math.ceil(total / pageSize)
    const canPreviousPage = page > 1
    const canNextPage = page < pageCount

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
          'border-t pt-4',
          className
        )}
      >
        {/* Page size selector - Desktop only */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Itens por página</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page info */}
        <div className="text-xs text-muted-foreground">
          Página <span className="font-semibold">{page}</span> de{' '}
          <span className="font-semibold">{Math.max(1, pageCount)}</span>
          {total > 0 && (
            <>
              {' • '}
              <span className="font-semibold">{total}</span> item{total !== 1 ? 's' : ''}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPreviousPage}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          {/* Page size selector - Mobile */}
          <div className="md:hidden flex items-center gap-1">
            <span className="text-xs text-muted-foreground">por pág:</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-8 w-[60px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNextPage}
            className="gap-1"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }
)

DataTablePagination.displayName = 'DataTablePagination'
