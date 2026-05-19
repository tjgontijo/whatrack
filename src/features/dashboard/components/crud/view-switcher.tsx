'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/utils'
import type { ViewType } from './types'

type ViewSwitcherProps = {
  view: ViewType
  setView: (view: ViewType) => void
  className?: string
  enabledViews?: ViewType[]
}

const VIEW_LABELS: Record<ViewType, string> = {
  list: 'Lista',
  kanban: 'Kanban',
}

export function ViewSwitcher({
  view,
  setView,
  className,
  enabledViews = ['list'],
}: ViewSwitcherProps) {
  const visibleTabs = enabledViews

  if (visibleTabs.length <= 1) return null

  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5', className)}>
      {visibleTabs.map((v) => (
        <button
          key={v}
          type='button'
          onClick={() => setView(v)}
          className={cn(
            'rounded-md px-2.5 py-1 font-medium text-xs transition-all',
            view === v
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {VIEW_LABELS[v]}
        </button>
      ))}
    </div>
  )
}
