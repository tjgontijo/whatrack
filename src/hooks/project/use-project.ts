import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api-client'
import { useOrganization } from '@/hooks/organization/use-organization'
import { useProjectRouteContext } from './project-route-context'

interface ProjectSummary {
  id: string
  name?: string | null
}

interface CurrentProjectResponse {
  projectId: string | null
  project: ProjectSummary | null
}

export function useProject(): {
  data: ProjectSummary | null
  isLoading: boolean
  error: unknown
} {
  const routeContext = useProjectRouteContext()
  const { data: organization, isLoading: isOrganizationLoading } = useOrganization()

  if (routeContext) {
    return {
      data: {
        id: routeContext.projectId,
        name: routeContext.projectName,
      },
      isLoading: false,
      error: null,
    }
  }

  const query = useQuery<CurrentProjectResponse>({
    queryKey: ['current-project', organization?.id],
    queryFn: () =>
      apiFetch('/api/v1/projects/current', {
        orgId: organization?.id,
      }) as Promise<CurrentProjectResponse>,
    enabled: Boolean(organization?.id),
    staleTime: 0,
  })

  return {
    data: query.data?.project ?? null,
    isLoading: isOrganizationLoading || query.isLoading,
    error: query.error,
  }
}
