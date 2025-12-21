'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus } from 'lucide-react'

import { ResponsiveDataTable } from '@/components/data-table/responsive-data-table'
import { ProductCard } from '@/components/data-table/cards/product-card'
import { FilterBar, FilterBarSection } from '@/components/data-table/filters/filter-bar'
import { FilterInput } from '@/components/data-table/filters/filter-input'
import { FilterSelect } from '@/components/data-table/filters/filter-select'
import { DataTableFiltersButton } from '@/components/data-table/filters/data-table-filters-button'
import { DataTableFiltersSheet } from '@/components/data-table/filters/data-table-filters-sheet'
import { FilterGroup } from '@/components/data-table/filters/filter-group'
import { FloatingActionButton } from '@/components/data-table/floating-action-button'

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

type ProductResponse = {
  items: Product[]
  total: number
  page: number
  pageSize: number
}

type CategoryResponse = {
  items: { id: string; name: string }[]
}

const STATUS_OPTIONS = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'active' },
  { label: 'Inativos', value: 'inactive' },
] as const

export function ProductsTable() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const searchParams = useSearchParams()
  const router = useRouter()

  // Filters
  const q = (searchParams.get('q') || '').trim()
  const status = (searchParams.get('status') as (typeof STATUS_OPTIONS)[number]['value']) ?? 'all'
  const categoryFilter = searchParams.get('categoryId') ?? 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = 20

  // Update query params
  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      mutator(params)
      params.set('page', '1')
      router.push(`/dashboard/products?${params.toString()}`)
    },
    [router, searchParams]
  )

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

  // Fetch products
  const productsQuery = useQuery({
    queryKey: ['products', organizationId, q, status, categoryFilter, page],
    queryFn: async () => {
      const url = new URL('/api/v1/products', window.location.origin)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', String(pageSize))
      if (q) url.searchParams.set('search', q)
      if (status !== 'all') url.searchParams.set('status', status)
      if (categoryFilter !== 'all') url.searchParams.set('categoryId', categoryFilter)
      const response = await fetch(url.toString(), {
        headers: { [ORGANIZATION_HEADER]: organizationId! },
      })
      if (!response.ok) throw new Error('Não foi possível carregar produtos')
      return (await response.json()) as ProductResponse
    },
    enabled: !!organizationId,
  })

  const items = productsQuery.data?.items ?? []
  const total = productsQuery.data?.total ?? 0
  const categories = categoriesQuery.data ?? []

  // Search input with debounce
  const [input, setInput] = React.useState(q)
  React.useEffect(() => setInput(q), [q])

  React.useEffect(() => {
    const trimmed = input.trim()
    if (trimmed.length === 0 || trimmed.length < 2 || trimmed === q) {
      if (trimmed.length === 0 && q) {
        updateQueryParams((params) => params.delete('q'))
      }
      return
    }
    const handle = window.setTimeout(() => {
      updateQueryParams((params) => params.set('q', trimmed))
    }, 400)
    return () => window.clearTimeout(handle)
  }, [input, q, updateQueryParams])


  // Columns for desktop
  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
      { header: 'Nome', accessorKey: 'name', cell: ({ getValue }) => getValue() },
      { header: 'Categoria', accessorKey: 'category', cell: ({ getValue }) => (getValue() as any)?.name ?? '—' },
      { header: 'Preço', accessorKey: 'price', cell: ({ getValue }) => formatCurrencyBRL(getValue() as number | null) },
      { header: 'Status', accessorKey: 'active', cell: ({ getValue }) => (getValue() ? 'Ativo' : 'Inativo') },
    ],
    []
  )

  // Mobile filters state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Dialog state
  const [isProductFormDialogOpen, setIsProductFormDialogOpen] = useState(false)

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (q) count++
    if (status !== 'all') count++
    if (categoryFilter !== 'all') count++
    return count
  }, [q, status, categoryFilter])

  return (
    <div className="space-y-4">
      {/* Desktop Filters */}
      <div className="hidden md:block">
        <FilterBar
          onClearAll={() => {
            updateQueryParams((params) => {
              params.delete('q')
              params.delete('status')
              params.delete('categoryId')
            })
          }}
          showClearButton={activeFilterCount > 0}
        >
          <FilterBarSection title="Busca">
            <FilterInput value={input} onChange={setInput} placeholder="Pesquisar produtos..." />
          </FilterBarSection>

          <FilterBarSection title="Status">
            <FilterSelect
              value={status}
              onChange={(val) => {
                updateQueryParams((params) => {
                  if (val === 'all') {
                    params.delete('status')
                  } else {
                    params.set('status', val)
                  }
                })
              }}
              options={STATUS_OPTIONS as any}
              placeholder="Selecione status"
            />
          </FilterBarSection>

          {categories.length > 0 && (
            <FilterBarSection title="Categoria">
              <FilterSelect
                value={categoryFilter}
                onChange={(val) => {
                  updateQueryParams((params) => {
                    if (val === 'all') {
                      params.delete('categoryId')
                    } else {
                      params.set('categoryId', val)
                    }
                  })
                }}
                options={[
                  { value: 'all', label: 'Todas' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Selecione categoria"
              />
            </FilterBarSection>
          )}
        </FilterBar>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <DataTableFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
      </div>

      {/* Mobile Filters Sheet */}
      <DataTableFiltersSheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen} title="Filtros">
        <FilterGroup label="Busca">
          <FilterInput value={input} onChange={setInput} placeholder="Pesquisar produtos..." />
        </FilterGroup>

        <FilterGroup label="Status">
          <FilterSelect
            value={status}
            onChange={(val) => {
              updateQueryParams((params) => {
                if (val === 'all') {
                  params.delete('status')
                } else {
                  params.set('status', val)
                }
              })
            }}
            options={STATUS_OPTIONS as any}
            placeholder="Selecione status"
          />
        </FilterGroup>

        {categories.length > 0 && (
          <FilterGroup label="Categoria">
            <FilterSelect
              value={categoryFilter}
              onChange={(val) => {
                updateQueryParams((params) => {
                  if (val === 'all') {
                    params.delete('categoryId')
                  } else {
                    params.set('categoryId', val)
                  }
                })
              }}
              options={[
                { value: 'all', label: 'Todas' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              placeholder="Selecione categoria"
            />
          </FilterGroup>
        )}
      </DataTableFiltersSheet>

      {/* Responsive Table */}
      <ResponsiveDataTable
        data={items}
        columns={columns}
        mobileCard={(row) => (
          <ProductCard
            id={row.original.id}
            name={row.original.name}
            active={row.original.active}
            category={row.original.category}
            price={row.original.price}
            cost={row.original.cost}
            updatedAt={row.original.updatedAt}
          />
        )}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: (newPage) => {
            const params = new URLSearchParams(Array.from(searchParams.entries()))
            params.set('page', String(newPage))
            router.push(`/dashboard/products?${params.toString()}`)
          },
          onPageSizeChange: () => {
            // Keep default page size for products
          },
        }}
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
      />

      {/* Product Form Dialog */}
      <ProductFormDialog
        categories={categories}
        open={isProductFormDialogOpen}
        onOpenChange={setIsProductFormDialogOpen}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        icon={Plus}
        label="Criar novo produto"
        onClick={() => setIsProductFormDialogOpen(true)}
      />
    </div>
  )
}
