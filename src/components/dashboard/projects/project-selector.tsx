'use client'

import { useQuery } from '@tanstack/react-query'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiFetch } from '@/lib/api-client'
import type { ProjectListResponse } from '@/schemas/projects/project-schemas'

const UNASSIGNED_PROJECT_VALUE = '__unassigned__'

type ProjectSelectorProps = {
  organizationId?: string
  value?: string | null
  onChange: (projectId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ProjectSelector({
  organizationId,
  value,
  onChange,
  placeholder = 'Selecionar projeto',
  disabled = false,
  className,
}: ProjectSelectorProps) {
  const { data, isLoading } = useQuery<ProjectListResponse>({
    queryKey: ['projects', 'selector', organizationId],
    queryFn: () =>
      apiFetch('/api/v1/projects?page=1&pageSize=100', {
        orgId: organizationId,
      }) as Promise<ProjectListResponse>,
    enabled: Boolean(organizationId),
    staleTime: 60_000,
  })

  return (
    <Select
      value={value ?? UNASSIGNED_PROJECT_VALUE}
      onValueChange={(nextValue) =>
        onChange(nextValue === UNASSIGNED_PROJECT_VALUE ? null : nextValue)
      }
      disabled={disabled || !organizationId}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? 'Carregando projetos...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_PROJECT_VALUE}>Sem projeto</SelectItem>
        {(data?.items ?? []).map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
