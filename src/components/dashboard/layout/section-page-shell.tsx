'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

export interface SectionTab {
  key: string
  label: string
}

interface SectionPageShellProps {
  title: string
  tabs?: SectionTab[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  /** Actions rendered on the right of the header — change per tab in the parent */
  actions?: React.ReactNode
  isLoading?: boolean
  children: React.ReactNode
}

export function SectionPageShell({
  title,
  tabs,
  activeTab,
  onTabChange,
  actions,
  isLoading,
  children,
}: SectionPageShellProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden">
      {/* Header bar — same h-12 pattern as CrudPageShell */}
      <div className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="shrink-0 text-sm font-semibold">{title}</h1>

        {/* Pill tab switcher — only rendered when tabs are provided */}
        {tabs && tabs.length > 0 && (
          <div className="ml-1 inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
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
        )}

        <div className="flex-1" />

        {actions}
      </div>

      {/* Content area */}
      <div className="scrollbar-hide flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="text-muted-foreground/40 h-6 w-6 animate-spin" />
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                Carregando...
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
