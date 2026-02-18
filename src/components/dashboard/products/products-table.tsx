'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package2, Tag } from 'lucide-react'

import { CrudPageShell } from '@/components/dashboard/crud/crud-page-shell'
import { CrudDataView } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { useCrudInfiniteQuery } from '@/hooks/use-crud-infinite-query'
import { type ColumnDef, type CardConfig, type RowActions, type ViewType } from '@/components/dashboard/crud/types'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import { ProductFormDialog } from './product-form-dialog'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

type Product = {
  id: string
  name: string
  active: boolean
  category: { id: string; name: string } | null
  price: number | null
  cost: number | null
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

const columns: ColumnDef<Product>[] = [
  {
    key: 'name',
    label: 'Nome',
    render: (item) => <span className="font-medium">{item.name}</span>,
  },
  {
    key: 'category',
    label: 'Categoria',
    width: 160,
    render: (item) => item.category?.name ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: 'price',
    label: 'Preço',
    width: 140,
    render: (item) => formatCurrencyBRL(item.price),
  },
  {
    key: 'cost',
    label: 'Custo',
    width: 140,
    render: (item) => formatCurrencyBRL(item.cost),
  },
  {
    key: 'active',
    label: 'Status',
    width: 100,
    render: (item) => (
      <Badge variant={item.active ? 'default' : 'secondary'}>
        {item.active ? 'Ativo' : 'Inativo'}
      </Badge>
    ),
  },
]

const cardConfig: CardConfig<Product> = {
  icon: () => <Package2 className="h-7 w-7 text-primary/60" />,
  title: (item) => item.name,
  subtitle: (item) => item.category ? (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Tag className="h-3 w-3" />
      {item.category.name}
    </span>
  ) : null,
  badge: (item) => (
    <Badge variant={item.active ? 'default' : 'secondary'} className="text-[10px]">
      {item.active ? 'Ativo' : 'Inativo'}
    </Badge>
  ),
  footer: (item) => (
    <span className="text-xs font-semibold text-foreground">{formatCurrencyBRL(item.price)}</span>
  ),
}

export function ProductsTable() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id

  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isProductFormDialogOpen, setIsProductFormDialogOpen] = useState(false)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.length >= 2 ? searchInput.trim() : '')
    }, 400)
    return () => clearTimeout(handle)
  }, [searchInput])

  const filters = React.useMemo(() => ({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(categoryFilter !== 'all' ? { categoryId: categoryFilter } : {}),
  }), [debouncedSearch, status, categoryFilter])

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['product-categories', organizationId],
    queryFn: async () => {
      const url = new URL('/api/v1/product-categories', window.location.origin)
      url.searchParams.set('status', 'active')
      url.searchParams.set('pageSize', '200')
      const response = await fetch(url.toString(), {
        headers: { [ORGANIZATION_HEADER]: organizationId! },
      })
      if (!response.ok) throw new Error('Não foi possível carregar categorias')
      return ((await response.json()) as CategoryResponse).items
    },
    staleTime: 60_000,
    enabled: !!organizationId,
  })
  const categories = categoriesQuery.data ?? []

  const {
    data,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useCrudInfiniteQuery<Product>({
    queryKey: ['products'],
    endpoint: '/api/v1/products',
    pageSize: 30,
    filters,
    enabled: !!organizationId,
  })

  const rowActions: RowActions<Product> = {
    customActions: () => null,
  }

  const filtersNode = (
    <>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-7 w-32 text-xs border-border">
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

      {categories.length > 0 && (
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-7 w-40 text-xs border-border">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  )

  return (
    <>
      <CrudPageShell
        title="Produtos"
        subtitle="Gerencie seus produtos e categorias."
        icon={Package2}
        onAdd={() => setIsProductFormDialogOpen(true)}
        view={view}
        setView={setView}
        enabledViews={['list', 'cards']}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar produtos..."
        totalItems={total}
        isFetchingMore={isFetchingNextPage}
        filters={filtersNode}
        isLoading={isLoading}
      >
        <CrudDataView
          data={data}
          view={view}
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

      <ProductFormDialog
        categories={categories}
        open={isProductFormDialogOpen}
        onOpenChange={setIsProductFormDialogOpen}
      />
    </>
  )
}
