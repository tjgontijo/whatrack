import { Suspense } from 'react'
import { RefreshCw } from 'lucide-react'

import { CategoriesTable } from '@/components/dashboard/item-categories/categories-table'

function CategoriesPageFallback() {
  return (
    <div className="text-muted-foreground flex h-[400px] w-full items-center justify-center rounded-xl border border-dashed">
      <RefreshCw className="mr-2 h-4 w-4 animate-spin opacity-50" />
      <span className="text-sm font-medium">Carregando categorias...</span>
    </div>
  )
}

export default function ItemCategoriesPage() {
  return (
    <div className="bg-muted/5 flex h-full w-full flex-col rounded-xl sm:bg-transparent">
      <Suspense fallback={<CategoriesPageFallback />}>
        <CategoriesTable />
      </Suspense>
    </div>
  )
}
