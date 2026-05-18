import type { ReactNode } from 'react'

import { cn } from '@/lib/utils/utils'

interface SectionShellProps {
  children: ReactNode
  className?: string
}

export function SectionShell({ children, className }: SectionShellProps) {
  return (
    <section className={cn('flex h-full w-full flex-col bg-background', className)}>
      {children}
    </section>
  )
}
