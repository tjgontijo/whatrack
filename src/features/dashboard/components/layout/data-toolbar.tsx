'use client'

import { Search } from 'lucide-react'
import type * as React from 'react'

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
      <div className='flex flex-1 items-center gap-2 overflow-x-auto pb-2 md:pb-0'>
        <div className='relative w-full max-w-[320px]'>
          <Search className='absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder={searchPlaceholder || 'Search...'}
            className='h-8 rounded-full border-transparent bg-muted/50 pl-9 text-xs focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring'
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
        </div>
        <div className='mx-2 h-4 w-[1px] bg-border' />
        {filters}
      </div>

      {actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
    </div>
  )
}
