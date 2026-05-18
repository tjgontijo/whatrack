import { RefreshCw } from 'lucide-react'
import { Suspense } from 'react'
import ClientLeadsTable from '@/features/leads/components/client-leads-table'

function LeadsPageFallback() {
  return (
    <div className='flex h-[400px] w-full items-center justify-center rounded-xl border border-dashed text-muted-foreground'>
      <RefreshCw className='mr-2 h-4 w-4 animate-spin opacity-50' />
      <span className='font-medium text-sm'>Carregando painel de leads...</span>
    </div>
  )
}

export default function LeadsPage() {
  return (
    <div className='flex h-full w-full flex-col rounded-xl bg-muted/5 sm:bg-transparent'>
      <Suspense fallback={<LeadsPageFallback />}>
        <ClientLeadsTable />
      </Suspense>
    </div>
  )
}
