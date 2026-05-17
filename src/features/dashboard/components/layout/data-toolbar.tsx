'use client'

import * as React from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/utils'

interface DataToolbarProps {
  filters?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

export function DataToolbar({
  filters,
  actions,
  className,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: DataToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 py-3 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-2 md:pb-0">
        <div className="relative w-full max-w-[320px]">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={searchPlaceholder || 'Search...'}
            className="bg-muted/50 focus-visible:bg-background focus-visible:ring-ring h-8 rounded-full border-transparent pl-9 text-xs focus-visible:ring-1"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
        </div>
        <div className="bg-border mx-2 h-4 w-[1px]" />
        {filters}
      </div>

      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
