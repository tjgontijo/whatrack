'use client'

import { Suspense } from 'react'

import ClientSalesTable from '@/components/dashboard/sales/client-sales-table'
import { RefreshCw } from 'lucide-react'

function TableSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
      <p className="text-sm font-medium text-muted-foreground">Carregando histórico de vendas...</p>
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
