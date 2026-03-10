'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'
import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  CrudCardView,
  CrudDataView,
  CrudListView,
  CrudPageShell,
  DeleteConfirmDialog,
} from '@/components/dashboard/crud'
import type {
  CardConfig,
  ColumnDef,
  RowActions,
  ViewType,
} from '@/components/dashboard/crud/types'
import { CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-client'
import type {
  ProjectListItem,
  ProjectListQuery,
  ProjectListResponse,
} from '@/schemas/projects/project-schemas'
import { ProjectFormDialog } from './project-form-dialog'

type ProjectListProps = {
  data: ProjectListResponse
  filters: ProjectListQuery
}

function buildPageHref(filters: ProjectListQuery, page: number) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(filters.pageSize))

  if (filters.query) {
    params.set('query', filters.query)
  }

  return `/dashboard/projects?${params.toString()}`
}

function buildProjectsHref(
  page: number,
  pageSize: number,
  query?: string,
) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  if (query) {
    params.set('query', query)
  }

  return `/dashboard/projects?${params.toString()}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function buildAssociationSummary(project: ProjectListItem) {
  return [
    `${project.counts.whatsappCount} WhatsApp`,
    `${project.counts.metaAdsCount} Meta Ads`,
    `${project.counts.leadCount} leads`,
  ].join(' · ')
}

const columns: ColumnDef<ProjectListItem>[] = [
  {
    key: 'name',
    label: 'Projeto',
    render: (project) => (
      <div className="space-y-1">
        <Link href={`/dashboard/projects/${project.id}`} className="font-medium hover:underline">
          {project.name}
        </Link>
        <div className="text-muted-foreground text-xs">
          {buildAssociationSummary(project)}
        </div>
      </div>
    ),
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    width: 120,
    render: (project) => <Badge variant="outline">{project.counts.whatsappCount}</Badge>,
  },
  {
    key: 'metaAds',
    label: 'Meta Ads',
    width: 120,
    render: (project) => <Badge variant="outline">{project.counts.metaAdsCount}</Badge>,
  },
  {
    key: 'crm',
    label: 'CRM',
    render: (project) => (
      <div className="text-sm text-muted-foreground">
        <span>{project.counts.leadCount} leads</span>
        <span className="mx-2">·</span>
        <span>{project.counts.ticketCount} tickets</span>
        <span className="mx-2">·</span>
        <span>{project.counts.saleCount} vendas</span>
      </div>
    ),
  },
  {
    key: 'updatedAt',
    label: 'Última atualização',
    width: 180,
    render: (project) => (
      <span className="text-sm text-muted-foreground">{formatDate(project.updatedAt)}</span>
    ),
  },
]

const cardConfig: CardConfig<ProjectListItem> = {
  icon: () => <FolderKanban className="h-6 w-6 text-emerald-600" />,
  title: (project) => project.name,
  subtitle: (project) => (
    <span className="text-muted-foreground text-xs">
      {buildAssociationSummary(project)}
    </span>
  ),
  badge: (project) => (
    <Badge variant="outline" className="text-[10px]">
      {project.counts.metaAdsCount} Meta Ads
    </Badge>
  ),
  footer: (project) => (
    <span className="text-muted-foreground text-xs">
      Atualizado em {formatDate(project.updatedAt)}
    </span>
  ),
}

export function ProjectList({ data, filters }: ProjectListProps) {
  const router = useRouter()
  const [isRouting, startTransition] = useTransition()
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState(filters.query ?? '')
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(searchInput)
  const totalOperationalRecords = useMemo(
    () =>
      data.items.reduce(
        (acc, item) =>
          acc +
          item.counts.whatsappCount +
          item.counts.metaAdsCount +
          item.counts.leadCount +
          item.counts.ticketCount +
          item.counts.saleCount,
        0,
      ),
    [data.items],
  )

  const hasPreviousPage = data.page > 1
  const hasNextPage = data.page < data.totalPages

  useEffect(() => {
    const nextQuery = deferredSearch.trim()
    const currentQuery = filters.query ?? ''

    if (nextQuery === currentQuery) {
      return
    }

    startTransition(() => {
      router.replace(buildProjectsHref(1, filters.pageSize, nextQuery || undefined))
    })
  }, [deferredSearch, filters.pageSize, filters.query, router])

  async function handleDelete(project: ProjectListItem) {
    try {
      setDeletingProjectId(project.id)
      await apiFetch(`/api/v1/projects/${project.id}`, {
        method: 'DELETE',
      })
      toast.success('Projeto removido')
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir projeto'
      const details = message.includes('dados associados')
        ? `O projeto "${project.name}" ainda possui dados associados. Deseja forçar a exclusão e desassociar esses registros?`
        : null

      if (details && window.confirm(details)) {
        try {
          await apiFetch(`/api/v1/projects/${project.id}?force=true`, {
            method: 'DELETE',
          })
          toast.success('Projeto removido e registros desassociados')
          router.refresh()
          return
        } catch (forceError) {
          toast.error(
            forceError instanceof Error ? forceError.message : 'Falha ao forçar exclusão do projeto',
          )
          return
        } finally {
          setDeletingProjectId(null)
        }
      }

      toast.error(message)
    } finally {
      setDeletingProjectId(null)
    }
  }

  const rowActions: RowActions<ProjectListItem> = {
    customActions: (project) => (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingProject(project)}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Editar
        </Button>

        <DeleteConfirmDialog
          onConfirm={() => handleDelete(project)}
          title="Excluir projeto?"
          description={`Isso removerá o projeto "${project.name}". Se existirem registros associados, o sistema pedirá uma confirmação adicional para desassociá-los.`}
          isLoading={deletingProjectId === project.id}
          trigger={
            <Button variant="outline" size="sm">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Excluir
            </Button>
          }
        />
      </>
    ),
  }

  return (
    <>
      <CrudPageShell
        title="Projetos"
        icon={FolderKanban}
        onAdd={() => setIsCreateOpen(true)}
        view={view}
        setView={setView}
        enabledViews={['list', 'cards']}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar por nome do projeto..."
        totalItems={data.total}
        isLoading={isRouting}
        actions={
          <div className="text-muted-foreground text-xs uppercase tracking-widest">
            <span className="text-foreground font-bold">{totalOperationalRecords}</span> registros operacionais
          </div>
        }
      >
        <CrudDataView
          data={data.items}
          view={view}
          emptyView={
            <CrudEmptyState
              title="Nenhum projeto cadastrado."
              description="Crie o primeiro projeto para organizar clientes, instâncias de WhatsApp, contas Meta Ads e dados operacionais."
            />
          }
          tableView={
            <CrudListView
              data={data.items}
              columns={columns}
              rowActions={rowActions}
            />
          }
          cardView={
            <CrudCardView
              data={data.items}
              config={cardConfig}
              rowActions={rowActions}
            />
          }
        />

        {data.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 px-6 pb-6">
            <Button asChild variant="outline" disabled={!hasPreviousPage}>
              <Link href={hasPreviousPage ? buildPageHref(filters, data.page - 1) : '#'}>
                Página anterior
              </Link>
            </Button>

            <p className="text-muted-foreground text-sm">
              Exibindo página {data.page} de {Math.max(data.totalPages, 1)}
            </p>

            <Button asChild variant="outline" disabled={!hasNextPage}>
              <Link href={hasNextPage ? buildPageHref(filters, data.page + 1) : '#'}>
                Próxima página
              </Link>
            </Button>
          </div>
        ) : null}
      </CrudPageShell>

      <ProjectFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => router.refresh()}
      />

      <ProjectFormDialog
        open={Boolean(editingProject)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProject(null)
          }
        }}
        project={editingProject}
        onSuccess={() => {
          setEditingProject(null)
          router.refresh()
        }}
      />
    </>
  )
}
