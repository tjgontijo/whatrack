import * as React from 'react'
import { Suspense } from 'react'
import ClientLeadsTable from '@/components/dashboard/leads/client-leads-table'
import { PageHeader } from '@/components/data-table/page-header'
import { RefreshCw } from 'lucide-react'

function LeadsPageFallback() {
  return (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-dashed text-muted-foreground">
      <RefreshCw className="mr-2 h-4 w-4 animate-spin opacity-50" />
      <span className="text-sm font-medium">Carregando painel de leads...</span>
    </div>
  )
}

export default function LeadsPage() {
  return (
    <div className="h-full w-full bg-muted/5 sm:bg-transparent rounded-xl flex flex-col">
      <Suspense fallback={<LeadsPageFallback />}>
        <ClientLeadsTable />
      </Suspense>
    </div>
  )
}
