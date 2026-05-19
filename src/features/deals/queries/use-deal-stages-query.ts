'use client'

import { useQuery } from '@tanstack/react-query'
import { DEAL_STAGES_QUERY_KEY } from '@/features/deal-stages/constants'
import type { DealStagesResponse } from '@/features/deals/types'
import { apiFetch } from '@/lib/http/api-client'

type UseDealStagesQueryParams = {
  organizationId: string
  projectId: string
  enabled?: boolean
}

export function getDealStagesQueryKey(organizationId: string, projectId: string) {
  return [...DEAL_STAGES_QUERY_KEY, organizationId, projectId] as const
}

export function useDealStagesQuery({
  organizationId,
  projectId,
  enabled = true,
}: UseDealStagesQueryParams) {
  return useQuery<DealStagesResponse>({
    queryKey: getDealStagesQueryKey(organizationId, projectId),
    queryFn: async () => {
      const params = new URLSearchParams({ projectId })
      return apiFetch(`/api/v1/deal-stages?${params.toString()}`, {
        orgId: organizationId,
        projectId,
      }) as Promise<DealStagesResponse>
    },
    enabled: enabled && Boolean(organizationId) && Boolean(projectId),
  })
}
