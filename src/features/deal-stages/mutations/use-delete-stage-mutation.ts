'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DEAL_STAGES_QUERY_KEY } from '@/features/deal-stages/constants'
import { apiFetch } from '@/lib/http/api-client'

interface DeleteStageMutationInput {
  stageId: string
  organizationId: string
  projectId: string
}

export function useDeleteStageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ stageId, organizationId, projectId }: DeleteStageMutationInput) => {
      await apiFetch(`/api/v1/deal-stages/${stageId}`, {
        method: 'DELETE',
        orgId: organizationId,
        projectId,
      })
    },
    onSuccess: () => {
      toast.success('Fase deletada')
      queryClient.invalidateQueries({ queryKey: DEAL_STAGES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
