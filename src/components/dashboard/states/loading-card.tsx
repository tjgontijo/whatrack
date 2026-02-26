import { cn } from '@/lib/utils/utils'

interface LoadingCardProps {
  className?: string
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900',
        className
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Value */}
      <div className="mb-2 h-8 w-24 rounded bg-gray-200 dark:bg-gray-800" />

      {/* Footer */}
      <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  )
}
