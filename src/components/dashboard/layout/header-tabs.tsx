'use client'

import { cn } from '@/lib/utils/utils'

export interface HeaderTab {
  key: string
  label: string
}

type HeaderTabsProps = {
  tabs: HeaderTab[]
  activeTab: string
  onTabChange: (tab: string) => void
  className?: string
}

export function HeaderTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: HeaderTabsProps) {
  if (tabs.length === 0) return null

  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
            activeTab === tab.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
