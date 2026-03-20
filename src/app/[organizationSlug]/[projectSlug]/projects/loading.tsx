import { FolderKanban } from 'lucide-react'

import { PageContent } from '@/components/dashboard/layout/page-content'
import { PageHeader } from '@/components/dashboard/layout/page-header'
import { PageShell } from '@/components/dashboard/layout/page-shell'
import { TableSkeleton } from '@/components/dashboard/states/table-skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Projetos"
        description="Cada projeto representa um cliente operacional da sua agência, com seus próprios canais e dados."
        icon={FolderKanban}
      />

      <PageContent>
        <Card>
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>

            <TableSkeleton rows={6} columns={6} />
          </CardContent>
        </Card>
      </PageContent>
    </PageShell>
  )
}
