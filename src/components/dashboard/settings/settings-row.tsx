import type { ReactNode } from 'react'

import { cn } from '@/lib/utils/utils'

type SettingsRowProps = {
  label: string
  description?: string
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function SettingsRow({
  label,
  description,
  children,
  className,
  contentClassName,
}: SettingsRowProps) {
  return (
    <div className={cn('grid gap-4 py-4 md:grid-cols-[220px_minmax(0,1fr)]', className)}>
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>

      <div className={cn('min-w-0', contentClassName)}>{children}</div>
    </div>
  )
}
