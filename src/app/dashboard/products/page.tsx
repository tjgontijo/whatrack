"use client"

import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductsTable } from '@/components/dashboard/products/products-table'
import { CategoriesTable } from '@/components/dashboard/products/categories-table'

export default function ProductsPage() {
  return (
    <Tabs defaultValue="products" className="space-y-4">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="products">Produtos</TabsTrigger>
        <TabsTrigger value="categories">Categorias</TabsTrigger>
      </TabsList>

      <TabsContent value="products">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
          <ProductsTable />
        </Suspense>
      </TabsContent>

      <TabsContent value="categories">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
          <CategoriesTable />
        </Suspense>
      </TabsContent>
    </Tabs>
  )
}
