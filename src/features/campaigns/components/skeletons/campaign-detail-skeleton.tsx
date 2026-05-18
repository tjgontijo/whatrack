import { Skeleton } from '@/components/ui/skeleton'
import { MetricsSkeleton } from '@/components/skeletons/metrics-skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

export function CampaignDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-96" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <MetricsSkeleton count={4} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="rounded-lg border p-6">
          <Skeleton className="h-80 w-full" />
        </div>
      </div>

      <TableSkeleton rows={5} columns={4} />
    </div>
  )
}
