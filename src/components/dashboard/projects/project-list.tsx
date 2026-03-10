'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { DeleteConfirmDialog } from '@/components/dashboard/crud'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

export function ProjectList({ data, filters }: ProjectListProps) {
  const router = useRouter()
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Projetos da organização</CardTitle>
          <CardDescription>
            Cada projeto representa um cliente operacional da agência, com suas
            próprias instâncias, contas Meta Ads e dados de CRM.
          </CardDescription>
          <CardAction>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo projeto
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-6">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
            <input
              type="text"
              name="query"
              defaultValue={filters.query ?? ''}
              placeholder="Buscar por nome do projeto"
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
            />

            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Projetos cadastrados
              </p>
              <p className="mt-2 text-2xl font-semibold">{data.total}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Página atual
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {data.page}
                <span className="text-muted-foreground text-base font-normal">
                  {' '}
                  / {Math.max(data.totalPages, 1)}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Registros operacionais
              </p>
              <p className="mt-2 text-2xl font-semibold">{totalOperationalRecords}</p>
            </div>
          </div>

          {data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Nenhum projeto cadastrado</h3>
                <p className="text-muted-foreground text-sm">
                  Crie o primeiro projeto para organizar clientes, instâncias de
                  WhatsApp, contas Meta Ads e dados operacionais.
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Criar primeiro projeto
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Meta Ads</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Última atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <Link href={`/dashboard/projects/${project.id}`} className="font-medium hover:underline">
                          {project.name}
                        </Link>
                        <div className="text-muted-foreground text-xs">
                          {buildAssociationSummary(project)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.counts.whatsappCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.counts.metaAdsCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        <span>{project.counts.leadCount} leads</span>
                        <span className="mx-2">·</span>
                        <span>{project.counts.ticketCount} tickets</span>
                        <span className="mx-2">·</span>
                        <span>{project.counts.saleCount} vendas</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(project.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {data.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
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
        </CardContent>
      </Card>

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
