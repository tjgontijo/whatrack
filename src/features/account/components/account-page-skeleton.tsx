import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function AccountCardSkeleton({
  fields = 3,
  footerWidth = 'w-32',
}: {
  fields?: number
  footerWidth?: string
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent className="grid gap-4">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="grid gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div>
          <Skeleton className={`h-9 rounded-4xl ${footerWidth}`} />
        </div>
      </CardContent>
    </Card>
  )
}

export function AccountPageSkeleton() {
  return (
    <div className="space-y-6" data-testid="account-page-skeleton">
      <AccountCardSkeleton />
      <AccountCardSkeleton />
      <AccountCardSkeleton fields={4} footerWidth="w-40" />
      <AccountCardSkeleton fields={2} footerWidth="w-36" />
    </div>
  )
}
