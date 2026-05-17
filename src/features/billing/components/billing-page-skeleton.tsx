import { Skeleton } from '@/components/ui/skeleton'

export function BillingPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Status Card Skeleton */}
      <div className="overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-lg border border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      </div>

      {/* Usage Card Skeleton */}
      <div className="overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}
