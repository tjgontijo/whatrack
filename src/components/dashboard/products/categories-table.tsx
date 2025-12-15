"use client"

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CategoryFormDialog } from './category-form-dialog'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'

type Category = {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type CategoryResponse = {
  items: Category[]
  total: number
  page: number
  pageSize: number
}

const STATUS_OPTIONS = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'active' },
  { label: 'Inativas', value: 'inactive' },
] as const

export function CategoriesTable() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const searchParams = useSearchParams()
  const router = useRouter()

  const searchValue = (searchParams.get('categoryQ') || '').trim()
  const status = (searchParams.get('categoryStatus') as (typeof STATUS_OPTIONS)[number]['value']) ?? 'all'
  const page = Math.max(1, parseInt(searchParams.get('categoryPage') || '1', 10) || 1)

  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      mutator(params)
      router.push(`/dashboard/products?${params.toString()}`)
    },
    [router, searchParams],
  )

  const categoriesQuery = useQuery({
    queryKey: ['categories', searchValue, status, page],
    queryFn: async () => {
      const url = new URL('/api/v1/product-categories', window.location.origin)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', '10')
      if (searchValue) url.searchParams.set('search', searchValue)
      if (status !== 'all') url.searchParams.set('status', status)

      const response = await fetch(url.toString(), {
        headers: {
          [ORGANIZATION_HEADER]: organizationId ?? '',
        },
      })
      if (!response.ok) throw new Error('Não foi possível carregar categorias')
      return (await response.json()) as CategoryResponse
    },
  })

  const totalPages = React.useMemo(() => {
    if (!categoriesQuery.data) return 1
    return Math.max(1, Math.ceil(categoriesQuery.data.total / categoriesQuery.data.pageSize))
  }, [categoriesQuery.data])

  const [input, setInput] = React.useState(searchValue)
  React.useEffect(() => setInput(searchValue), [searchValue])

  React.useEffect(() => {
    const trimmed = input.trim()

    if (!trimmed.length) {
      if (searchValue) {
        updateQueryParams((params) => {
          params.delete('categoryQ')
          params.set('categoryPage', '1')
        })
      }
      return undefined
    }

    if (trimmed.length < 3) {
      if (searchValue) {
        updateQueryParams((params) => {
          params.delete('categoryQ')
          params.set('categoryPage', '1')
        })
      }
      return undefined
    }

    if (trimmed === searchValue) {
      return undefined
    }

    const handle = window.setTimeout(() => {
      updateQueryParams((params) => {
        params.set('categoryQ', trimmed)
        params.set('categoryPage', '1')
      })
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [input, searchValue, updateQueryParams])

  const handleStatusChange = (value: (typeof STATUS_OPTIONS)[number]['value']) => {
    updateQueryParams((params) => {
      if (value === 'all') {
        params.delete('categoryStatus')
      } else {
        params.set('categoryStatus', value)
      }
      params.set('categoryPage', '1')
    })
  }

  const goToPage = (next: number) => {
    updateQueryParams((params) => {
      params.set('categoryPage', String(Math.max(1, next)))
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Input
              className="pr-10"
              placeholder="Nome da categoria"
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
                <SelectValue placeholder="Todas" />
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
        </div>

        <CategoryFormDialog
          onSuccess={() => {
            void categoriesQuery.refetch()
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Criada em</th>
            </tr>
          </thead>
          <tbody>
            {categoriesQuery.data?.items.map((category) => (
              <tr key={category.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{category.name}</div>
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {new Date(category.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={category.active ? 'default' : 'secondary'}>
                    {category.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {new Date(category.createdAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
            {!categoriesQuery.data?.items.length && !categoriesQuery.isFetching ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma categoria encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {categoriesQuery.isFetching ? (
          <div className="border-t px-4 py-2 text-sm text-muted-foreground">Atualizando...</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>
          Página {categoriesQuery.data?.page ?? 1} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={page <= 1 || categoriesQuery.isFetching}
            onClick={() => goToPage(page - 1)}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={categoriesQuery.isFetching || page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </section>
  )
}
