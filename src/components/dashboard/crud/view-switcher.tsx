'use client'

import * as React from 'react'
import { LayoutGrid, List, Kanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { ViewType } from './types'

type ViewSwitcherProps = {
  view: ViewType
  setView: (view: ViewType) => void
  className?: string
  enabledViews?: ViewType[]
}

const VIEW_CONFIG = {
  list: { label: 'Lista', icon: List },
  cards: { label: 'Cards', icon: LayoutGrid },
  kanban: { label: 'Kanban', icon: Kanban },
} as const

export function ViewSwitcher({
  view,
  setView,
  className,
  enabledViews = ['list', 'cards']
}: ViewSwitcherProps) {
  const isMobile = useIsMobile()

  const visibleTabs = React.useMemo(
    () => enabledViews.map(viewType => ({
      id: viewType,
      ...VIEW_CONFIG[viewType]
    })),
    [enabledViews]
  )

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {visibleTabs.map((tab) => {
        const isActive = view === tab.id
        const Icon = tab.icon
        const isDisabled = isMobile && tab.id === 'list'

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && setView(tab.id)}
            disabled={isDisabled}
            className={cn(
              'group relative flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'text-foreground'
                : isDisabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            title={isDisabled ? 'Visualização em lista disponível apenas em telas maiores que 1200px' : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-primary shadow-[0_0_8px_0_var(--color-primary)]" />
            )}

            {!isActive && !isDisabled && (
              <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors group-hover:bg-muted-foreground/20" />
            )}
          </button>
        )
      })}
    </div>
  )
}
