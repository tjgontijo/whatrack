'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DEALS_QUERY_KEY } from '@/features/deals/constants'
import { apiFetch } from '@/lib/http/api-client'

type UseMoveDealMutationParams = {
  organizationId: string
  projectId: string
}

type MoveDealInput = {
  dealId: string
  stageId: string
}

export function useMoveDealMutation({ organizationId, projectId }: UseMoveDealMutationParams) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dealId, stageId }: MoveDealInput) =>
      apiFetch(`/api/v1/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
        orgId: organizationId,
        projectId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY })
    },
  })
}
