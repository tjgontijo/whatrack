import { ReactNode } from 'react'
import { LucideIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface ErrorStateProps {
  icon?: LucideIcon
  title: string
  message?: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  icon: Icon = AlertCircle,
  title,
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex min-h-[400px] flex-col items-center justify-center py-12', className)}>
      <div className="flex max-w-md flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/20">
          <Icon className="h-6 w-6 text-red-600 dark:text-red-500" />
        </div>

        {/* Title */}
        <h3 className="text-heading mb-2 text-gray-900 dark:text-white">{title}</h3>

        {/* Message */}
        {message && (
          <p className="text-body mb-6 text-gray-500 dark:text-gray-400">{message}</p>
        )}

        {/* Action */}
        {action && <div className="flex flex-wrap items-center justify-center gap-2">{action}</div>}
      </div>
    </div>
  )
}
