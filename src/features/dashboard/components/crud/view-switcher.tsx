'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/utils'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import { ViewType } from './types'

type ViewSwitcherProps = {
  view: ViewType
  setView: (view: ViewType) => void
  className?: string
  enabledViews?: ViewType[]
}

const VIEW_LABELS: Record<ViewType, string> = {
  list: 'Lista',
  cards: 'Cards',
  kanban: 'Kanban',
}

export function ViewSwitcher({
  view,
  setView,
  className,
  enabledViews = ['list', 'cards'],
}: ViewSwitcherProps) {
  const isMobile = useIsMobile()

  const visibleTabs = React.useMemo(
    () => enabledViews.filter((v) => !(isMobile && (v === 'list' || v === 'kanban'))),
    [enabledViews, isMobile]
  )

  React.useEffect(() => {
    if (visibleTabs.length === 0 || visibleTabs.includes(view)) return
    setView(visibleTabs[0])
  }, [setView, view, visibleTabs])

  if (visibleTabs.length <= 1) return null

  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5', className)}>
      {visibleTabs.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
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
