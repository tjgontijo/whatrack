'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
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
import { useRequiredProjectPath } from '@/hooks/project/project-route-context'
import { useCrudInfiniteQuery } from '@/hooks/ui/use-crud-infinite-query'
import { apiFetch } from '@/lib/api-client'
import type {
  ProjectListItem,
} from '@/schemas/projects/project-schemas'
import { ProjectFormDialog } from './project-form-dialog'

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

export function ProjectList() {
  const router = useRouter()
  const projectsPath = useRequiredProjectPath('/projects')
  const [view, setView] = useState<ViewType>('list')
  const [searchInput, setSearchInput] = useState('')
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(searchInput)

  const filters = useMemo(() => {
    const query = deferredSearch.trim()

    return {
      ...(query.length >= 2 ? { query } : {}),
    }
  }, [deferredSearch])

  const { data, total, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCrudInfiniteQuery<ProjectListItem>({
      queryKey: ['projects'],
      endpoint: '/api/v1/projects',
      pageSize: 24,
      filters,
    })

  const totalOperationalRecords = useMemo(
    () =>
      data.reduce(
        (acc, item) =>
          acc +
          item.counts.whatsappCount +
          item.counts.metaAdsCount +
          item.counts.leadCount +
          item.counts.ticketCount +
          item.counts.saleCount,
        0
      ),
    [data]
  )

  const columns = useMemo<ColumnDef<ProjectListItem>[]>(
    () => [
      {
        key: 'name',
        label: 'Projeto',
        render: (project) => (
          <div className="space-y-1">
            <Link href={`${projectsPath}/${project.id}`} className="font-medium hover:underline">
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
    ],
    [projectsPath],
  )

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
        showTitle={false}
        onAdd={() => setIsCreateOpen(true)}
        view={view}
        setView={setView}
        enabledViews={['list', 'cards']}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar por nome do projeto..."
        totalItems={total}
        isFetchingMore={isFetchingNextPage}
        isLoading={isLoading}
        actions={
          <div className="text-muted-foreground text-xs uppercase tracking-widest">
            <span className="text-foreground font-bold">{totalOperationalRecords}</span> registros operacionais
          </div>
        }
      >
        <CrudDataView
          data={data}
          view={view}
          emptyView={
            <CrudEmptyState
              title="Nenhum projeto cadastrado."
              description="Crie o primeiro projeto para organizar clientes, instâncias de WhatsApp, contas Meta Ads e dados operacionais."
            />
          }
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
