'use client'

import * as React from 'react'
import { useState, useDeferredValue, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { HeaderPageShell } from '@/components/dashboard/layout'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import {
  type ColumnDef,
  type RowActions,
} from '@/components/dashboard/crud/types'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

interface ItemsTableProps {
  hideHeader?: boolean
  searchInput?: string
  onSearchChange?: (value: string) => void
  status?: string
  onStatusChange?: (value: string) => void
  categoryFilter?: string
  onCategoryFilterChange?: (value: string) => void
  onOpenNewForm?: () => void
  triggerOpenForm?: number
  getRefreshCallback?: (callback: () => void) => void
}

export function ItemsTable({
  hideHeader = false,
  searchInput: externalSearchInput,
  onSearchChange: externalOnSearchChange,
  status: externalStatus,
  onStatusChange: externalOnStatusChange,
  categoryFilter: externalCategoryFilter,
  onCategoryFilterChange: externalOnCategoryFilterChange,
  onOpenNewForm,
  triggerOpenForm = 0,
  getRefreshCallback,
}: ItemsTableProps) {
  const { data: org } = useOrganization()
  const organizationId = org?.id

  const [localSearchInput, setLocalSearchInput] = useState('')
  const [localStatus, setLocalStatus] = useState<string>('all')
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('all')
  const [isItemFormDrawerOpen, setIsItemFormDrawerOpen] = useState(false)

  React.useEffect(() => {
    if (triggerOpenForm > 0 && hideHeader) {
      setIsItemFormDrawerOpen(true)
    }
  }, [triggerOpenForm, hideHeader])

  const searchInput = hideHeader ? externalSearchInput ?? localSearchInput : localSearchInput
  const onSearchChange = hideHeader ? externalOnSearchChange ?? setLocalSearchInput : setLocalSearchInput
  const status = hideHeader ? externalStatus ?? localStatus : localStatus
  const onStatusChange = hideHeader ? externalOnStatusChange ?? setLocalStatus : setLocalStatus
  const categoryFilter = hideHeader ? externalCategoryFilter ?? localCategoryFilter : localCategoryFilter
  const onCategoryFilterChange = hideHeader ? externalOnCategoryFilterChange ?? setLocalCategoryFilter : setLocalCategoryFilter

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

  const { data, total, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useCrudInfiniteQuery<Item>({
      queryKey: ['items'],
      endpoint: '/api/v1/items',
      pageSize: 30,
      filters,
      enabled: !!organizationId,
    })

  React.useEffect(() => {
    if (hideHeader && getRefreshCallback) {
      getRefreshCallback(() => void refetch())
    }
  }, [hideHeader, getRefreshCallback, refetch])

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

  const rowActions: RowActions<Item> = {
    customActions: () => null,
  }

  const filtersNode = (
    <>
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">Status</p>
        <Select value={status} onValueChange={onStatusChange}>
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
          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
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

  const content = (
    <>
      {data.length === 0 && !isLoading ? (
        <CrudEmptyState />
      ) : (
        <CrudListView
          data={data}
          columns={columns}
          rowActions={rowActions}
          onEndReached={hasNextPage ? fetchNextPage : undefined}
        />
      )}

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

  if (hideHeader) {
    return content
  }

  return (
    <HeaderPageShell
      title="Itens"
      primaryAction={
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => onOpenNewForm?.() ?? setIsItemFormDrawerOpen(true)}
        >
          Novo
        </Button>
      }
      searchValue={searchInput}
      onSearchChange={onSearchChange}
      searchPlaceholder="Buscar itens..."
      onRefresh={() => void refetch()}
      isFetchingMore={isFetchingNextPage}
      filters={filtersNode}
      isLoading={isLoading}
    >
      {content}
    </HeaderPageShell>
  )
}
