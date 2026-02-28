import { Skeleton } from '@/components/ui/skeleton'

export function BillingPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Status Card Skeleton */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
        <div className="mb-6 space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>

        <Skeleton className="mt-6 h-10 w-full" />
      </div>

      {/* Usage Progress Skeleton */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-2 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}
