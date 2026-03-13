import { ReactNode } from 'react'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'

interface SectionHeaderProps {
  title?: string
  subtitle?: string
  icon?: LucideIcon
  actions?: ReactNode
  children?: ReactNode
  className?: string
  backLink?: string
}

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className,
  backLink,
}: SectionHeaderProps) {
  const hasIntro = Boolean(backLink || Icon || title || subtitle)

  return (
    <div className={cn('border-border bg-background flex flex-col border-b', className)}>
      {(hasIntro || actions) && (
        <div className="flex flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {backLink ? (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-muted-foreground -ml-2 h-8 w-8 shrink-0"
              >
                <Link href={backLink}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}

            {(Icon || title || subtitle) && (
              <>
                {Icon ? (
                  <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  {title ? (
                    <h1 className="text-foreground text-lg font-bold tracking-tight">{title}</h1>
                  ) : null}
                  {subtitle ? <p className="text-muted-foreground text-xs">{subtitle}</p> : null}
                </div>
              </>
            )}
          </div>

          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}

      {children ? <div className="px-6">{children}</div> : null}
    </div>
  )
}
