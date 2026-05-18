import { Skeleton } from '@/components/ui/skeleton'

export function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="border rounded-lg p-6">
        <Skeleton className="h-96 w-full" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-6">
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="border rounded-lg p-6">
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </div>
  )
}
