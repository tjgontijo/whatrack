'use client'

import { useState, useMemo } from 'react'
import { HeaderPageShell, HeaderTabs, type HeaderTab } from '@/components/dashboard/layout'
import { CategoriesTable } from '@/components/dashboard/item-categories/categories-table'
import { ItemsTable } from '@/components/dashboard/items/items-table'
import { Button } from '@/components/ui/button'

type CatalogPageContentProps = {
  selectedTab: 'items' | 'categories'
}

export function CatalogPageContent({ selectedTab }: CatalogPageContentProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>(selectedTab)
  const [itemsSearch, setItemsSearch] = useState('')
  const [itemsStatus, setItemsStatus] = useState('all')
  const [itemsCategory, setItemsCategory] = useState('all')
  const [categoriesSearch, setCategoriesSearch] = useState('')
  const [categoriesStatus, setCategoriesStatus] = useState('all')

  const tabs = useMemo<HeaderTab[]>(() => [
    { key: 'items', label: 'Itens' },
    { key: 'categories', label: 'Categorias' },
  ], [])

  return (
    <HeaderPageShell
      title="Catálogo"
      selector={
        <HeaderTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'items' | 'categories')}
        />
      }
      searchValue={activeTab === 'items' ? itemsSearch : categoriesSearch}
      onSearchChange={activeTab === 'items' ? setItemsSearch : setCategoriesSearch}
      searchPlaceholder={activeTab === 'items' ? 'Buscar itens...' : 'Buscar categorias...'}
    >
      {activeTab === 'items' && (
        <ItemsTable
          hideHeader
          searchInput={itemsSearch}
          onSearchChange={setItemsSearch}
          status={itemsStatus}
          onStatusChange={setItemsStatus}
          categoryFilter={itemsCategory}
          onCategoryFilterChange={setItemsCategory}
        />
      )}
      {activeTab === 'categories' && (
        <CategoriesTable
          hideHeader
          searchInput={categoriesSearch}
          onSearchChange={setCategoriesSearch}
          statusFilter={categoriesStatus}
          onStatusFilterChange={setCategoriesStatus}
        />
      )}
    </HeaderPageShell>
  )
}
