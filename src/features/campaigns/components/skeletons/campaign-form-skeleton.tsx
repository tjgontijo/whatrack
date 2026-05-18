import { Skeleton } from '@/components/ui/skeleton'
import { FormSkeleton } from '@/components/skeletons/form-skeleton'

export function CampaignFormSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="border rounded-lg p-6">
        <FormSkeleton fields={8} />
      </div>
    </div>
  )
}
