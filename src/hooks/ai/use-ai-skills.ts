'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AiSkill } from '@/types/ai/ai-skill'

export const AI_SKILLS_QUERY_KEY = ['ai-skills'] as const

async function fetchSkills(): Promise<AiSkill[]> {
  const res = await fetch('/api/v1/ai-skills')
  if (!res.ok) throw new Error('Erro ao carregar skills.')
  const data = await res.json()
  return data.skills ?? []
}

export function useAiSkills() {
  return useQuery({
    queryKey: AI_SKILLS_QUERY_KEY,
    queryFn: fetchSkills,
  })
}

export function useCreateAiSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      slug: string
      name: string
      description?: string
      content: string
      kind: 'SHARED' | 'AGENT'
    }): Promise<AiSkill> => {
      const res = await fetch('/api/v1/ai-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao criar skill.')
      }
      const data = await res.json()
      return data.skill
    },
    onSuccess: () => {
      toast.success('Skill criada com sucesso.')
      queryClient.invalidateQueries({ queryKey: AI_SKILLS_QUERY_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useUpdateAiSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<{
        slug: string
        name: string
        description: string
        content: string
        kind: 'SHARED' | 'AGENT'
        isActive: boolean
      }>
    }): Promise<AiSkill> => {
      const res = await fetch(`/api/v1/ai-skills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao atualizar skill.')
      }
      const data = await res.json()
      return data.skill
    },
    onSuccess: () => {
      toast.success('Skill atualizada.')
      queryClient.invalidateQueries({ queryKey: AI_SKILLS_QUERY_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useDeleteAiSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/v1/ai-skills/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao remover skill.')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_SKILLS_QUERY_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
