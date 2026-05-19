'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DEAL_STAGES_QUERY_KEY } from '@/features/deal-stages/constants'
import { apiFetch } from '@/lib/http/api-client'

type StageColumnInput = {
  id: string
}

type CreateStageMutationInput = {
  organizationId: string
  projectId: string
  name: string
  color: string
  insertAfterIndex: number
  columns: StageColumnInput[]
}

export function useCreateStageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      organizationId,
      projectId,
      name,
      color,
      insertAfterIndex,
      columns,
    }: CreateStageMutationInput) => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Nome obrigatório')

      const newStage = (await apiFetch('/api/v1/deal-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          color,
          statusGroup: 'ACTIVE',
          probability: 50,
        }),
        orgId: organizationId,
        projectId,
      })) as { id: string }

      const isAtEnd = insertAfterIndex >= columns.length - 1
      if (!isAtEnd && newStage.id) {
        const orderedIds = [
          ...columns.slice(0, insertAfterIndex + 1).map((column) => column.id),
          newStage.id,
          ...columns.slice(insertAfterIndex + 1).map((column) => column.id),
        ]

        await apiFetch('/api/v1/deal-stages/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds, projectId }),
          orgId: organizationId,
          projectId,
        })
      }

      return newStage
    },
    onSuccess: () => {
      toast.success('Fase criada!')
      queryClient.invalidateQueries({ queryKey: DEAL_STAGES_QUERY_KEY })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
