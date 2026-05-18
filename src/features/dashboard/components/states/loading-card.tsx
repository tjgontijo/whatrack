import { cn } from '@/lib/utils/utils'

interface LoadingCardProps {
  className?: string
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div className={cn('animate-pulse rounded-lg border border-border bg-card p-5', className)}>
      <div className='mb-4 flex items-center justify-between'>
        <div className='h-4 w-32 rounded bg-muted' />
        <div className='h-4 w-4 rounded bg-muted' />
      </div>
      <div className='mb-2 h-8 w-24 rounded bg-muted' />
      <div className='h-3 w-20 rounded bg-muted' />
    </div>
  )
}
