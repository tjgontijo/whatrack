import { ReactNode } from 'react'
import { cn } from '@/lib/utils/utils'

interface PageToolbarProps {
  children: ReactNode
  className?: string
}

export function PageToolbar({ children, className }: PageToolbarProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center',
        className
      )}
    >
      {children}
    </div>
  )
}
