'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/http/api-client'

interface ReorderStageMutationInput {
  stageId: string
  direction: 'up' | 'down'
  columns: Array<{ id: string }>
  organizationId: string
  projectId: string
}

export function useReorderStageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      stageId,
      direction,
      columns,
      organizationId,
      projectId,
    }: ReorderStageMutationInput) => {
      const currentIndex = columns.findIndex((c) => c.id === stageId)
      if (currentIndex === -1) throw new Error('Fase não encontrada')

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= columns.length) {
        throw new Error(`Não é possível mover ${direction === 'up' ? 'para cima' : 'para baixo'}`)
      }

      const newIds = [...columns.map((c) => c.id)]
      ;[newIds[currentIndex], newIds[newIndex]] = [newIds[newIndex], newIds[currentIndex]]

      await apiFetch('/api/v1/deal-stages/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newIds, projectId }),
        orgId: organizationId,
        projectId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
