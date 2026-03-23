'use client'

import { useState, useMemo } from 'react'
import { HeaderPageShell, HeaderTabs, type HeaderTab } from '@/components/dashboard/layout'
import { CategoriesTable } from '@/components/dashboard/item-categories/categories-table'
import { ItemsTable } from '@/components/dashboard/items/items-table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CatalogPageContentProps = {
  selectedTab: 'items' | 'categories'
}

const STATUS_OPTIONS_ITEMS = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'active' },
  { label: 'Inativos', value: 'inactive' },
] as const

const STATUS_OPTIONS_CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'inactive', label: 'Inativas' },
] as const

export function CatalogPageContent({ selectedTab }: CatalogPageContentProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>(selectedTab)
  const [itemsSearch, setItemsSearch] = useState('')
  const [itemsStatus, setItemsStatus] = useState('all')
  const [itemsCategory, setItemsCategory] = useState('all')
  const [categoriesSearch, setCategoriesSearch] = useState('')
  const [categoriesStatus, setCategoriesStatus] = useState('all')
  const [triggerItemForm, setTriggerItemForm] = useState(0)
  const [triggerCategoryForm, setTriggerCategoryForm] = useState(0)
  const [itemsRefresh, setItemsRefresh] = useState<(() => void) | null>(null)
  const [categoriesRefresh, setCategoriesRefresh] = useState<(() => void) | null>(null)

  const tabs = useMemo<HeaderTab[]>(() => [
    { key: 'items', label: 'Itens' },
    { key: 'categories', label: 'Categorias' },
  ], [])

  const filters = useMemo(() => {
    if (activeTab === 'items') {
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">Status</p>
            <Select value={itemsStatus} onValueChange={setItemsStatus}>
              <SelectTrigger className="border-border h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS_ITEMS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    }

    if (activeTab === 'categories') {
      return (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">Status</p>
          <Select value={categoriesStatus} onValueChange={setCategoriesStatus}>
            <SelectTrigger className="border-border h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS_CATEGORIES.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    return undefined
  }, [activeTab, itemsStatus, categoriesStatus])

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
      primaryAction={
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => {
            if (activeTab === 'items') {
              setTriggerItemForm(v => v + 1)
            } else {
              setTriggerCategoryForm(v => v + 1)
            }
          }}
        >
          Novo
        </Button>
      }
      filters={filters}
      onRefresh={() => {
        if (activeTab === 'items') {
          itemsRefresh?.()
        } else {
          categoriesRefresh?.()
        }
      }}
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
          triggerOpenForm={triggerItemForm}
          getRefreshCallback={setItemsRefresh}
        />
      )}
      {activeTab === 'categories' && (
        <CategoriesTable
          hideHeader
          searchInput={categoriesSearch}
          onSearchChange={setCategoriesSearch}
          statusFilter={categoriesStatus}
          onStatusFilterChange={setCategoriesStatus}
          triggerOpenForm={triggerCategoryForm}
          getRefreshCallback={setCategoriesRefresh}
        />
      )}
    </HeaderPageShell>
  )
}
