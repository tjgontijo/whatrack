'use client'

import { RefreshCw } from 'lucide-react'
import { Suspense } from 'react'
import ClientSalesTable from '@/features/sales/components/client-sales-table'

function TableSkeleton() {
  return (
    <div className='flex min-h-[400px] flex-col items-center justify-center gap-3'>
      <RefreshCw className='h-8 w-8 animate-spin text-primary/40' />
      <p className='font-medium text-muted-foreground text-sm'>Carregando histórico de vendas...</p>
    </div>
  )
}

export default function SalesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ClientSalesTable />
    </Suspense>
  )
}
