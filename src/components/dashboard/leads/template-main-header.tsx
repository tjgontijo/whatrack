'use client'

import * as React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type TemplateMainHeaderProps = {
    title?: string
    subtitle?: string
    actions?: React.ReactNode
    children?: React.ReactNode
    className?: string
    backLink?: string
}

export function TemplateMainHeader({
    title,
    subtitle,
    actions,
    children,
    className,
    backLink,
}: TemplateMainHeaderProps) {
    return (
        <div className={cn('flex flex-col border-b border-border bg-background', className)}>
            <div className="flex flex-col gap-2 px-6 py-1 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    {backLink && (
                        <Button variant="ghost" size="icon" asChild className="-ml-2 h-8 w-8 text-muted-foreground">
                            <Link href={backLink}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                    {(title || subtitle) && (
                        <div>
                            {title && <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>}
                            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                        </div>
                    )}
                </div>

                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {children && <div className="px-6">{children}</div>}
        </div>
    )
}
