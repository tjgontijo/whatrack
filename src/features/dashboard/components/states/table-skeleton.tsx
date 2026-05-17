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
      <div className="flex gap-4 border-b border-gray-200 pb-3 dark:border-gray-800">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 border-b border-gray-100 py-3 dark:border-gray-900">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={cn(
                'h-4 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-900',
                // Vary widths for more realistic look
                colIndex === 0 && 'w-32',
                colIndex === columns - 1 && 'w-20'
              )}
              style={{
                animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
