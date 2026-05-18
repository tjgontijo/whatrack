import { Skeleton } from '@/components/ui/skeleton'

export function MetaAdsSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex items-center gap-2 border-b">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-10 px-4 py-2 w-40" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  )
}
