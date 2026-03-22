import { ReactNode } from 'react'
import { LucideIcon, Inbox } from 'lucide-react'
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
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon className="text-muted-foreground h-6 w-6" />
        </div>

        <h3 className="text-foreground mb-2 text-base font-semibold">{title}</h3>

        {description && (
          <p className="text-muted-foreground mb-6 text-sm">{description}</p>
        )}

        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
