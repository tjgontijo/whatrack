import { Box } from 'lucide-react'

import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { CategoriesTable } from '@/components/dashboard/item-categories/categories-table'
import { ItemsTable } from '@/components/dashboard/items/items-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type CatalogPageContentProps = {
  selectedTab: 'items' | 'categories'
}

export function CatalogPageContent({ selectedTab }: CatalogPageContentProps) {
  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Catálogo"
        description="Gerencie itens e categorias usados no CRM dos seus projetos."
        icon={Box}
      />

      <PageContent>
        <Tabs defaultValue={selectedTab} className="gap-6">
          <TabsList variant="line" className="w-full justify-start rounded-none border-b p-0">
            <TabsTrigger value="items">Itens</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <ItemsTable />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTable />
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageShell>
  )
}
