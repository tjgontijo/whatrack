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
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Title */}
        <h3 className="text-heading mb-2 text-gray-900 dark:text-white">{title}</h3>

        {/* Description */}
        {description && (
          <p className="text-body mb-6 text-gray-500 dark:text-gray-400">{description}</p>
        )}

        {/* Action */}
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
