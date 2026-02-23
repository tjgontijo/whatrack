import { Suspense } from 'react'
import { ItemsTable } from '@/components/dashboard/items/items-table'
import { RefreshCw } from 'lucide-react'

function ItemsPageFallback() {
  return (
    <div className="text-muted-foreground flex h-[400px] w-full items-center justify-center rounded-xl border border-dashed">
      <RefreshCw className="mr-2 h-4 w-4 animate-spin opacity-50" />
      <span className="text-sm font-medium">Carregando itens...</span>
    </div>
  )
}

export default function ItemsPage() {
  return (
    <div className="bg-muted/5 flex h-full w-full flex-col rounded-xl sm:bg-transparent">
      <Suspense fallback={<ItemsPageFallback />}>
        <ItemsTable />
      </Suspense>
    </div>
  )
}
