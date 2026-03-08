import { AccountPageSkeleton } from '@/components/dashboard/account/account-page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pt-8 first:pt-0">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <AccountPageSkeleton />
    </div>
  )
}
