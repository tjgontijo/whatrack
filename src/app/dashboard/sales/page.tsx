'use client'

import { Suspense } from 'react'

import ClientSalesTable from '@/components/dashboard/sales/client-sales-table'
import { RefreshCw } from 'lucide-react'

function TableSkeleton() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
      <RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />
      <p className="text-muted-foreground text-sm font-medium">Carregando histórico de vendas...</p>
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
