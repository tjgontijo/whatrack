'use client'

import { useRouter } from 'next/navigation'
import { FolderKanban, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { apiFetch } from '@/lib/api-client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ProjectContextGateProps = {
  organizationId: string
  projects: Array<{
    id: string
    name: string
  }>
  activeProjectId: string | null
}

const ALL_PROJECTS_VALUE = '__all_projects__'

export function ProjectContextGate({
  organizationId,
  projects,
  activeProjectId,
}: ProjectContextGateProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (projectId: string | null) =>
      apiFetch('/api/v1/projects/current', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
        orgId: organizationId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries()
      router.refresh()
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Falha ao trocar projeto ativo')
    },
  })

  if (projects.length === 0) {
    return null
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
        <FolderKanban className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Projeto ativo
        </p>
        <div className="mt-1 max-w-sm">
          <Select
            value={activeProjectId ?? ALL_PROJECTS_VALUE}
            onValueChange={(value) =>
              updateMutation.mutate(value === ALL_PROJECTS_VALUE ? null : value)
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROJECTS_VALUE}>Todos os projetos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {updateMutation.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Aplicando...
        </div>
      ) : null}
    </div>
  )
}
