import { Skeleton } from '@/components/ui/skeleton'
import { MetricsSkeleton } from '@/components/skeletons/metrics-skeleton'

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <MetricsSkeleton count={5} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="rounded-lg border p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}
