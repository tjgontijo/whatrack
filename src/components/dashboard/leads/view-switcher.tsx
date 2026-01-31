'use client'

import * as React from 'react'
import { LayoutGrid, List } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ViewType = 'list' | 'cards'

type ViewSwitcherProps = {
    view: ViewType
    setView: (view: ViewType) => void
    className?: string
}

export function ViewSwitcher({ view, setView, className }: ViewSwitcherProps) {
    const tabs = [
        { id: 'list', label: 'Lista', icon: List },
        { id: 'cards', label: 'Cards', icon: LayoutGrid },
    ] as const

    return (
        <div className={cn('flex items-center gap-1', className)}>
            {tabs.map((tab) => {
                const isActive = view === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id)}
                        className={cn(
                            'group relative flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            isActive
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                    >
                        <tab.icon className="h-3.5 w-3.5" />
                        <span>{tab.label}</span>
                        {isActive && (
                            <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-primary shadow-[0_0_8px_0_var(--color-primary)]" />
                        )}

                        {!isActive && (
                            <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors group-hover:bg-muted-foreground/20" />
                        )}
                    </button>
                )
            })}
        </div>
    )
}
