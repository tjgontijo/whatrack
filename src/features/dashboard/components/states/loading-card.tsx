import { cn } from '@/lib/utils/utils'

interface LoadingCardProps {
  className?: string
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div
      className={cn(
        'border-border bg-card animate-pulse rounded-lg border p-5',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="bg-muted h-4 w-32 rounded" />
        <div className="bg-muted h-4 w-4 rounded" />
      </div>
      <div className="bg-muted mb-2 h-8 w-24 rounded" />
      <div className="bg-muted h-3 w-20 rounded" />
    </div>
  )
}
