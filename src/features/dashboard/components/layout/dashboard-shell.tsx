'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { AppSidebarProps } from '@/features/dashboard/components/sidebar/app-sidebar'
import { AppSidebar } from '@/features/dashboard/components/sidebar/app-sidebar'

type DashboardShellProps = Omit<AppSidebarProps, 'collapsed' | 'onToggle'> & {
  children: ReactNode
  showLaunchpad?: boolean
}

export function DashboardShell({ children, showLaunchpad, ...sidebarProps }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={300}>
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <AppSidebar
          {...sidebarProps}
          showLaunchpad={showLaunchpad}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />

        <main className='scrollbar-hide flex-1 flex flex-col overflow-hidden overflow-x-hidden rounded-tl-xl bg-background'>
          <div className='min-w-0 flex-1 min-h-0 flex flex-col 3xl:px-6 px-4 pt-4'>
            <div className='mx-auto w-full min-w-0 max-w-screen-4xl flex-1 min-h-0 flex flex-col'>{children}</div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
