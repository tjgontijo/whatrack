'use client'

import * as React from 'react'
import { useState, useDeferredValue, useMemo, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { CrudListView } from '@/components/dashboard/crud/crud-list-view'
import { DeleteConfirmDialog } from '@/components/dashboard/crud/delete-confirm-dialog'
import { HeaderPageShell } from '@/components/dashboard/layout'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import {
  type ColumnDef,
  type RowActions,
} from '@/components/dashboard/crud/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useOrganization } from '@/hooks/organization/use-organization'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { apiFetch } from '@/lib/api-client'
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

interface CategoriesTableProps {
  hideHeader?: boolean
  searchInput?: string
  onSearchChange?: (value: string) => void
  statusFilter?: string
  onStatusFilterChange?: (value: string) => void
  onOpenNewForm?: () => void
  onRefresh?: () => void
  triggerOpenForm?: number
}

export function CategoriesTable({
  hideHeader = false,
  searchInput: externalSearchInput,
  onSearchChange: externalOnSearchChange,
  statusFilter: externalStatusFilter,
  onStatusFilterChange: externalOnStatusFilterChange,
  onOpenNewForm,
  onRefresh: externalOnRefresh,
  triggerOpenForm = 0,
}: CategoriesTableProps) {
  const queryClient = useQueryClient()
  const { data: org } = useOrganization()
  const organizationId = org?.id
  const [localSearchInput, setLocalSearchInput] = useState('')
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  React.useEffect(() => {
    if (triggerOpenForm > 0 && hideHeader) {
      setEditingCategory(null)
      setIsFormOpen(true)
    }
  }, [triggerOpenForm, hideHeader])

  const searchInput = hideHeader ? externalSearchInput ?? localSearchInput : localSearchInput
  const onSearchChange = hideHeader ? externalOnSearchChange ?? setLocalSearchInput : setLocalSearchInput
  const statusFilter = hideHeader ? externalStatusFilter ?? localStatusFilter : localStatusFilter
  const onStatusFilterChange = hideHeader ? externalOnStatusFilterChange ?? setLocalStatusFilter : setLocalStatusFilter

  const deferredSearch = useDeferredValue(searchInput)

  const filters = useMemo(() => {
    const search = deferredSearch.trim()
    const hasSearch = search.length >= 2

    return {
      ...(hasSearch ? { search } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    }
  }, [deferredSearch, statusFilter])

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
      return apiFetch(`/api/v1/item-categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !category.active }),
        orgId: organizationId,
      })
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
      return apiFetch(`/api/v1/item-categories/${categoryId}`, {
        method: 'DELETE',
        orgId: organizationId,
      })
    },
    onSuccess: (payload: any) => {
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
          <Button variant="ghost" size="icon-sm" title="Mais ações">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
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
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">Status</p>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="border-border h-8 w-full text-xs">
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
    </div>
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

  if (hideHeader) {
    return content
  }

  return (
    <HeaderPageShell
      title="Categorias"
      primaryAction={
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => onOpenNewForm?.() ?? (setEditingCategory(null), setIsFormOpen(true))}
        >
          Novo
        </Button>
      }
      searchValue={searchInput}
      onSearchChange={onSearchChange}
      searchPlaceholder="Buscar categoria..."
      onRefresh={() => void (externalOnRefresh?.() ?? refetch())}
      isFetchingMore={isFetchingNextPage}
      filters={filtersNode}
      isLoading={isLoading}
    >
      {content}
    </HeaderPageShell>
  )
}
