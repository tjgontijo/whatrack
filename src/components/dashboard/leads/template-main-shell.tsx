'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type TemplateMainShellProps = {
    children: React.ReactNode
    className?: string
}

export function TemplateMainShell({ children, className }: TemplateMainShellProps) {
    return (
        <section className={cn('flex flex-col h-full w-full bg-background', className)}>
            {children}
        </section>
    )
}
