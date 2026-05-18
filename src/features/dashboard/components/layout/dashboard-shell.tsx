'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { AppSidebarProps } from '@/features/dashboard/components/sidebar/app-sidebar'
import { AppSidebar } from '@/features/dashboard/components/sidebar/app-sidebar'

type DashboardShellProps = Omit<AppSidebarProps, 'collapsed' | 'onToggle'> & {
  children: ReactNode
}

export function DashboardShell({ children, ...sidebarProps }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={300}>
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <AppSidebar
          {...sidebarProps}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />

        <main className='scrollbar-hide flex-1 overflow-y-auto overflow-x-hidden rounded-tl-xl bg-background'>
          <div className='min-w-0 3xl:px-6 px-4 py-4'>
            <div className='mx-auto w-full min-w-0 max-w-screen-4xl'>{children}</div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
