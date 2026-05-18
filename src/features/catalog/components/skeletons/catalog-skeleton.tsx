import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

export function CatalogSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex items-center gap-2 border-b">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-10 px-4 py-2 w-32" />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-64 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-24" />
      </div>
      <TableSkeleton rows={8} columns={5} />
    </div>
  )
}
