import { ReactNode } from 'react'

import { cn } from '@/lib/utils/utils'

interface SectionShellProps {
  children: ReactNode
  className?: string
}

export function SectionShell({ children, className }: SectionShellProps) {
  return (
    <section className={cn('bg-background flex h-full w-full flex-col', className)}>
      {children}
    </section>
  )
}
