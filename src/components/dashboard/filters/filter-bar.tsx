import { ReactNode } from 'react'
import { cn } from '@/lib/utils/utils'

interface FilterBarProps {
  children: ReactNode
  className?: string
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'mb-6 grid gap-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2 xl:grid-cols-5',
        className
      )}
    >
      {children}
    </div>
  )
}
