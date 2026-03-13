import { ReactNode } from 'react'
import { cn } from '@/lib/utils/utils'

interface PageShellProps {
  children: ReactNode
  className?: string
  /**
   * Maximum width for centered content
   * - undefined (default): full width capped at 1920px (2K)
   * - '3xl': max-w-3xl  — forms, settings
   * - '5xl': max-w-5xl  — detail views
   * - '7xl': max-w-7xl  — wide tables/dashboards
   */
  maxWidth?: '3xl' | '5xl' | '7xl'
}

export function PageShell({ children, className, maxWidth }: PageShellProps) {
  const containerClass = maxWidth
    ? {
        '3xl': 'mx-auto w-full max-w-3xl',
        '5xl': 'mx-auto w-full max-w-5xl',
        '7xl': 'mx-auto w-full max-w-7xl',
      }[maxWidth]
    : 'mx-auto w-full max-w-screen-3xl'

  return (
    <div className={cn('flex h-full flex-col bg-muted/30', className)}>
      <div className={cn('flex flex-1 flex-col px-6 py-6 lg:px-8 3xl:px-12', containerClass)}>
        {children}
      </div>
    </div>
  )
}
