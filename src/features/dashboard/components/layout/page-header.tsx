import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/utils'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className='flex items-start gap-3'>
        {Icon && (
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Icon className='h-5 w-5' />
          </div>
        )}
        <div className='min-w-0 flex-1'>
          <h1 className='text-display text-foreground'>{title}</h1>
          {description && <p className='mt-1 text-caption text-muted-foreground'>{description}</p>}
        </div>
      </div>

      {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
    </div>
  )
}
