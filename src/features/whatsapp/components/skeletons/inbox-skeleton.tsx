import { Skeleton } from '@/components/ui/skeleton'

export function InboxSkeleton() {
  return (
    <div className="flex h-screen">
      <div className="w-80 border-r p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <div className="flex-1 flex flex-col p-4 space-y-4">
        <Skeleton className="h-12 w-96" />
        <div className="flex-1 border rounded-lg p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-3/4 ml-auto" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
