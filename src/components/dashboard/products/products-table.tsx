"use client"

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductFormDialog } from './product-form-dialog'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'

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

  const q = (searchParams.get('q') || '').trim()
  const status = (searchParams.get('status') as (typeof STATUS_OPTIONS)[number]['value']) ?? 'all'
  const categoryFilter = searchParams.get('categoryId') ?? 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      mutator(params)
      router.push(`/dashboard/products?${params.toString()}`)
    },
    [router, searchParams],
  )

  const categoriesQuery = useQuery({
    queryKey: ['product-categories', organizationId],
    queryFn: async () => {
      const url = new URL('/api/v1/product-categories', window.location.origin)
      url.searchParams.set('status', 'active')
      url.searchParams.set('pageSize', '200')
      const response = await fetch(url.toString(), {
        headers: {
          [ORGANIZATION_HEADER]: organizationId!,
        },
      })
      if (!response.ok) throw new Error('Não foi possível carregar categorias')
      const json = (await response.json()) as CategoryResponse
      return json.items
    },
    staleTime: 60_000,
    enabled: !!organizationId,
  })

  const productsQuery = useQuery({
    queryKey: ['products', organizationId, q, status, categoryFilter, page],
    queryFn: async () => {
      const url = new URL('/api/v1/products', window.location.origin)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', '10')
      if (q) url.searchParams.set('search', q)
      if (status !== 'all') url.searchParams.set('status', status)
      if (categoryFilter !== 'all') url.searchParams.set('categoryId', categoryFilter)

      const response = await fetch(url.toString(), {
        headers: {
          [ORGANIZATION_HEADER]: organizationId!,
        },
      })
      if (!response.ok) throw new Error('Não foi possível carregar produtos')
      return (await response.json()) as ProductResponse
    },
    enabled: !!organizationId,
  })

  const [input, setInput] = React.useState(q)
  React.useEffect(() => setInput(q), [q])

  React.useEffect(() => {
    const trimmed = input.trim()

    if (!trimmed.length || trimmed.length < 3) {
      if (q) {
        updateQueryParams((params) => {
          params.delete('q')
          params.set('page', '1')
        })
      }
      return undefined
    }

    if (trimmed === q) {
      return undefined
    }

    const handle = window.setTimeout(() => {
      updateQueryParams((params) => {
        params.set('q', trimmed)
        params.set('page', '1')
      })
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [input, q, updateQueryParams])

  const totalPages = React.useMemo(() => {
    if (!productsQuery.data) return 1
    return Math.max(1, Math.ceil(productsQuery.data.total / productsQuery.data.pageSize))
  }, [productsQuery.data])

  const handleStatusChange = (value: (typeof STATUS_OPTIONS)[number]['value']) => {
    updateQueryParams((params) => {
      if (value === 'all') {
        params.delete('status')
      } else {
        params.set('status', value)
      }
      params.set('page', '1')
    })
  }

  const handleCategoryChange = (value: string) => {
    updateQueryParams((params) => {
      if (value === 'all') {
        params.delete('categoryId')
      } else {
        params.set('categoryId', value)
      }
      params.set('page', '1')
    })
  }

  const goToPage = (next: number) => {
    updateQueryParams((params) => {
      params.set('page', String(Math.max(1, next)))
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Input
              className="pr-10"
              placeholder="Nome do produto"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            {input.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-transparent p-1 text-muted-foreground transition hover:border-border hover:bg-muted"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Select value={status} onValueChange={(value) => handleStatusChange(value as typeof status)}>
            <SelectTrigger className="w-[180px] justify-between">
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</span>
                <SelectValue placeholder="Todos" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="min-w-[200px] justify-between">
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Categoria</span>
                <SelectValue placeholder="Todas" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(categoriesQuery.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ProductFormDialog
          categories={categoriesQuery.data ?? []}
          onSuccess={() => {
            void productsQuery.refetch()
            void categoriesQuery.refetch()
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Produto</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Preço</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Custo</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {productsQuery.data?.items.map((product) => (
              <tr key={product.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{product.name}</div>
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {new Date(product.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </td>
                <td className="px-4 py-3">{product.category?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  {product.price != null ? formatCurrency(product.price) : '—'}
                </td>
                <td className="px-4 py-3">
                  {product.cost != null ? formatCurrency(product.cost) : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={product.active ? 'default' : 'secondary'}>
                    {product.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
              </tr>
            ))}
            {!productsQuery.data?.items.length && !productsQuery.isFetching ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {productsQuery.isFetching ? (
          <div className="border-t px-4 py-2 text-sm text-muted-foreground">Atualizando...</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>
          Página {productsQuery.data?.page ?? 1} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={page <= 1 || productsQuery.isFetching}
            onClick={() => goToPage(page - 1)}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={productsQuery.isFetching || page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </section>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
