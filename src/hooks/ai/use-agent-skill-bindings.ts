'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

interface SkillBindingPayload {
  skillId: string
  sortOrder: number
  isActive: boolean
}

export function useUpdateAgentSkillBindings(agentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bindings: SkillBindingPayload[]): Promise<void> => {
      const res = await fetch(`/api/v1/ai-agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillBindings: bindings }),
      })
      if (!res.ok) throw new Error('Erro ao salvar ordem das skills.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents', agentId] })
    },
    // sem toast — feedback silencioso para auto-save de reordenação
  })
}
