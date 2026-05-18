import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/utils'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className='flex gap-4 border-b pb-3'>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className='h-4 flex-1' />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className='flex gap-4 border-b py-3 last:border-0'
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-4 flex-1',
                colIndex === 0 && 'flex-[2]',
                colIndex === columns - 1 && 'flex-[0.5]'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
