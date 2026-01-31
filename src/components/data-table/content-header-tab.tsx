'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ContentHeaderTabItem {
  value: string
  label: string
  count?: number
}

interface ContentHeaderTabProps {
  items: ContentHeaderTabItem[]
  value?: string
  onChange?: (value: string) => void
  className?: string
}

/**
 * ContentHeaderTab - Componente de abas para o header
 * Usado para filtros rápidos como (All, New, Contacted, Customer)
 */
export const ContentHeaderTab = React.forwardRef<HTMLDivElement, ContentHeaderTabProps>(
  ({ items, value, onChange, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-1', className)}
        role="tablist"
      >
        {items.map((item) => (
          <Button
            key={item.value}
            variant={value === item.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange?.(item.value)}
            className="h-8 px-3 text-sm"
            role="tab"
            aria-selected={value === item.value}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 text-xs font-medium opacity-70">
                {item.count}
              </span>
            )}
          </Button>
        ))}
      </div>
    )
  }
)

ContentHeaderTab.displayName = 'ContentHeaderTab'
