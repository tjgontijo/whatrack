'use client'

import * as React from 'react'
import { useState, useDeferredValue, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package2, Tag } from 'lucide-react'

import { CrudPageShell } from '@/components/dashboard/crud/crud-page-shell'
import { CrudDataView, CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import {
  type ColumnDef,
  type CardConfig,
  type RowActions,
  type ViewType,
} from '@/components/dashboard/crud/types'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import { ItemFormDrawer } from './item-form-drawer'
import { apiFetch } from '@/lib/api-client'
import { useOrganization } from '@/hooks/organization/use-organization'


type Item = {
  id: string
  name: string
  active: boolean
  category: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

type CategoryResponse = {
  items: { id: string; name: string }[]
}

const STATUS_OPTIONS = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'active' },
  { label: 'Inativos', value: 'inactive' },
] as const

const columns: ColumnDef<Item>[] = [
  {
    key: 'name',
    label: 'Nome',
    render: (item) => <span className="font-medium">{item.name}</span>,
  },
  {
    key: 'category',
    label: 'Categoria',
    width: 180,
    render: (item) => item.category?.name ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: 'active',
    label: 'Status',
    width: 110,
    render: (item) => (
      <Badge variant={item.active ? 'default' : 'secondary'}>
        {item.active ? 'Ativo' : 'Inativo'}
      </Badge>
    ),
  },
]

const cardConfig: CardConfig<Item> = {
  icon: () => <Package2 className="text-primary/60 h-7 w-7" />,
  title: (item) => item.name,
  subtitle: (item) =>
    item.category ? (
      <>
        <Tag className="h-3 w-3" />
        {item.category.name}
      </>
    ) : null,
  badge: (item) => (
    <Badge variant={item.active ? 'default' : 'secondary'} className="text-[10px]">
      {item.active ? 'Ativo' : 'Inativo'}
    </Badge>
  ),
  footer: (item) => <span className="text-muted-foreground text-xs">{item.category?.name ?? 'Sem categoria'}</span>,
}

export function ItemsTable() {
  const { data: org } = useOrganization()
  const organizationId = org?.id

  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isItemFormDrawerOpen, setIsItemFormDrawerOpen] = useState(false)

  const deferredSearch = useDeferredValue(searchInput)

  const filters = useMemo(
    () => {
      const search = deferredSearch.trim()
      const hasSearch = search.length >= 2

      return {
        ...(hasSearch ? { search } : {}),
        ...(status !== 'all' ? { status } : {}),
        ...(categoryFilter !== 'all' ? { categoryId: categoryFilter } : {}),
      }
    },
    [deferredSearch, status, categoryFilter]
  )



  const categoriesQuery = useQuery({
    queryKey: ['item-categories', organizationId],
    queryFn: async () => {
      const url = new URL('/api/v1/item-categories', window.location.origin)
      url.searchParams.set('status', 'active')
      url.searchParams.set('pageSize', '200')
      const data = await apiFetch(url.toString(), {
        orgId: organizationId,
      })
      return (data as CategoryResponse).items
    },

    staleTime: 60_000,
    enabled: !!organizationId,
  })
  const categories = categoriesQuery.data ?? []

  const { data, total, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useCrudInfiniteQuery<Item>({
      queryKey: ['items'],
      endpoint: '/api/v1/items',
      pageSize: 30,
      filters,
      enabled: !!organizationId,
    })

  const rowActions: RowActions<Item> = {
    customActions: () => null,
  }

  const filtersNode = (
    <>
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">Status</p>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="border-border h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categories.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">Categoria</p>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="border-border h-8 w-full text-xs">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todas as categorias
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )

  return (
    <>
      <CrudPageShell
        title="Itens"
        onAdd={() => setIsItemFormDrawerOpen(true)}
        view={view}
        setView={setView}
        enabledViews={['list', 'cards']}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar itens..."
        onRefresh={() => void refetch()}
        isFetchingMore={isFetchingNextPage}
        filters={filtersNode}
        isLoading={isLoading}
      >
        <CrudDataView
          data={data}
          view={view}
          emptyView={<CrudEmptyState />}
          tableView={
            <CrudListView
              data={data}
              columns={columns}
              rowActions={rowActions}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
          cardView={
            <CrudCardView
              data={data}
              config={cardConfig}
              rowActions={rowActions}
              onEndReached={hasNextPage ? fetchNextPage : undefined}
            />
          }
        />
      </CrudPageShell>

      <ItemFormDrawer
        categories={categories}
        open={isItemFormDrawerOpen}
        onOpenChange={setIsItemFormDrawerOpen}
        onSuccess={() => {
          void categoriesQuery.refetch()
          void refetch()
        }}
      />
    </>
  )
}
