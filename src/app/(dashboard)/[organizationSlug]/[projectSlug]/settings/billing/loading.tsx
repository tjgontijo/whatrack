import { CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageContent } from '@/features/dashboard/components/layout/page-content'
import { PageHeader } from '@/features/dashboard/components/layout/page-header'
import { PageShell } from '@/features/dashboard/components/layout/page-shell'
import { TableSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <PageShell maxWidth='7xl'>
      <PageHeader
        title='Planos e Cobrança'
        description='Catálogo interno dos planos, com visão de quotas, assinaturas e faturamento.'
        icon={CreditCard}
      />

      <PageContent>
        <Card>
          <CardHeader className='space-y-3'>
            <Skeleton className='h-6 w-40' />
            <Skeleton className='h-4 w-96 max-w-full' />
          </CardHeader>

          <CardContent className='space-y-6'>
            <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px_120px]'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>

            <div className='grid gap-3 md:grid-cols-3'>
              <Skeleton className='h-24 w-full rounded-xl' />
              <Skeleton className='h-24 w-full rounded-xl' />
              <Skeleton className='h-24 w-full rounded-xl' />
            </div>

            <TableSkeleton rows={6} columns={6} />
          </CardContent>
        </Card>
      </PageContent>
    </PageShell>
  )
}
