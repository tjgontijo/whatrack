import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex min-h-[400px] flex-col items-center justify-center py-12', className)}>
      <div className='flex max-w-md flex-col items-center text-center'>
        <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
          <Icon className='h-6 w-6 text-muted-foreground' />
        </div>

        <h3 className='mb-2 font-semibold text-base text-foreground'>{title}</h3>

        {description && <p className='mb-6 text-muted-foreground text-sm'>{description}</p>}

        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
