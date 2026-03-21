'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import { AppSidebar } from '@/components/dashboard/sidebar/app-sidebar'
import type { AppSidebarProps } from '@/components/dashboard/sidebar/app-sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

type DashboardShellProps = Omit<AppSidebarProps, 'collapsed' | 'onToggle'> & {
  children: ReactNode
}

export function DashboardShell({ children, ...sidebarProps }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AppSidebar
          {...sidebarProps}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />

        <main className="bg-background rounded-tl-xl flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="3xl:px-6 min-w-0 px-4 py-4">
            <div className="max-w-screen-4xl mx-auto w-full min-w-0">{children}</div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
