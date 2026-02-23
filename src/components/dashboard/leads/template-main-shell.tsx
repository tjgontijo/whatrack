'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type TemplateMainShellProps = {
  children: React.ReactNode
  className?: string
}

export function TemplateMainShell({ children, className }: TemplateMainShellProps) {
  return (
    <section className={cn('bg-background flex h-full w-full flex-col', className)}>
      {children}
    </section>
  )
}
