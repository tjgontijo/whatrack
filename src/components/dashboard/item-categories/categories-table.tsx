'use client'

import * as React from 'react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Tag, Trash2, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'

import { CrudPageShell } from '@/components/dashboard/crud/crud-page-shell'
import { CrudDataView, CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { CrudCardView } from '@/components/dashboard/crud/crud-card-view'
import { DeleteConfirmDialog } from '@/components/dashboard/crud/delete-confirm-dialog'
import { useCrudInfiniteQuery } from '@/hooks/use-crud-infinite-query'
import {
  type CardConfig,
  type ColumnDef,
  type RowActions,
  type ViewType,
} from '@/components/dashboard/crud/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { CategoryFormDrawer, type CategoryFormData } from './category-form-drawer'

type Category = {
  id: string
  name: string
  active: boolean
  itemsCount: number
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'inactive', label: 'Inativas' },
] as const

const columns: ColumnDef<Category>[] = [
  {
    key: 'name',
    label: 'Categoria',
    render: (category) => <span className="font-medium">{category.name}</span>,
  },
  {
    key: 'itemsCount',
    label: 'Itens vinculados',
    width: 150,
    render: (category) => <span>{category.itemsCount}</span>,
  },
  {
    key: 'active',
    label: 'Status',
    width: 120,
    render: (category) => (
      <Badge variant={category.active ? 'default' : 'secondary'}>
        {category.active ? 'Ativa' : 'Inativa'}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    label: 'Criada em',
    width: 160,
    render: (category) => (
      <span className="text-muted-foreground text-xs">
        {new Date(category.createdAt).toLocaleDateString('pt-BR')}
      </span>
    ),
  },
]

const cardConfig: CardConfig<Category> = {
  icon: () => <Tag className="text-primary/60 h-7 w-7" />,
  title: (category) => category.name,
  subtitle: (category) => (
    <span className="text-muted-foreground text-xs">
      {category.itemsCount} {category.itemsCount === 1 ? 'item' : 'itens'}
    </span>
  ),
  badge: (category) => (
    <Badge variant={category.active ? 'default' : 'secondary'} className="text-[10px]">
      {category.active ? 'Ativa' : 'Inativa'}
    </Badge>
  ),
  footer: (category) => (
    <span className="text-muted-foreground text-xs">
      Criada em {new Date(category.createdAt).toLocaleDateString('pt-BR')}
    </span>
  ),
}

export function CategoriesTable() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const debounceRef = React.useRef<NodeJS.Timeout>(null)

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.length >= 2 ? value.trim() : '')
    }, 400)
  }, [])

  const filters = React.useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    }),
    [debouncedSearch, statusFilter]
  )

  const { data, total, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useCrudInfiniteQuery<Category>({
      queryKey: ['item-categories-crud'],
      endpoint: '/api/v1/item-categories',
      pageSize: 30,
      filters,
    })

  const refreshAll = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['item-categories'] })
    void queryClient.invalidateQueries({ queryKey: ['item-categories-crud'] })
    void refetch()
  }, [queryClient, refetch])

  const toggleMutation = useMutation({
    mutationFn: async (category: Category) => {
      const response = await fetch(`/api/v1/item-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !category.active }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error ?? 'Falha ao alterar status da categoria')
      }
      return response.json()
    },
    onSuccess: (_, category) => {
      toast.success(category.active ? 'Categoria desativada' : 'Categoria ativada')
      refreshAll()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await fetch(`/api/v1/item-categories/${categoryId}`, {
        method: 'DELETE',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body?.error ?? 'Falha ao excluir categoria')
      }
      return body as { message?: string }
    },
    onSuccess: (payload) => {
      setDeletingCategory(null)
      toast.success(payload.message ?? 'Categoria excluída')
      refreshAll()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const rowActions: RowActions<Category> = {
    customActions: (category) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-md"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setEditingCategory({
                id: category.id,
                name: category.name,
                active: category.active,
              })
              setIsFormOpen(true)
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toggleMutation.mutate(category)}>
            {category.active ? (
              <PowerOff className="mr-2 h-4 w-4" />
            ) : (
              <Power className="mr-2 h-4 w-4" />
            )}
            {category.active ? 'Desativar' : 'Ativar'}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeletingCategory(category)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }

  const filtersNode = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="border-border h-7 w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <>
      <CrudPageShell
        title="Categorias"
        showTitle={false}
        icon={Tag}
        onAdd={() => {
          setEditingCategory(null)
          setIsFormOpen(true)
        }}
        view={view}
        setView={setView}
        enabledViews={['list', 'cards']}
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar categoria..."
        totalItems={total}
        isFetchingMore={isFetchingNextPage}
        filters={filtersNode}
        isLoading={isLoading}
      >
        <CrudDataView
          data={data}
          view={view}
          emptyView={<CrudEmptyState title="Nenhuma categoria encontrada." />}
          tableView={
            <CrudListView
              data={data}
              columns={columns}
              rowActions={rowActions}
              className="min-h-[calc(100vh-300px)]"
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

      <CategoryFormDrawer
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={editingCategory}
        onSuccess={refreshAll}
      />

      <DeleteConfirmDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Excluir categoria?"
        description={
          deletingCategory
            ? `Deseja excluir a categoria "${deletingCategory.name}"?`
            : 'Deseja excluir esta categoria?'
        }
        trigger={null}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingCategory) {
            deleteMutation.mutate(deletingCategory.id)
          }
        }}
      />
    </>
  )
}
