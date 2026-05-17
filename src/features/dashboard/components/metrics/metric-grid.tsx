import { ReactNode } from 'react'
import { cn } from '@/lib/utils/utils'

interface MetricGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function MetricGrid({
  children,
  columns = 4,
  className,
}: MetricGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        {
          'grid-cols-1': columns === 1,
          'grid-cols-1 md:grid-cols-2': columns === 2,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': columns === 3,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-4': columns === 4,
        },
        className
      )}
    >
      {children}
    </div>
  )
}
