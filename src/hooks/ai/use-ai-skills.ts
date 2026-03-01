'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AiSkill } from '@/types/ai/ai-skill'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'


export const AI_SKILLS_QUERY_KEY = ['ai-skills'] as const



async function fetchSkills(orgId: string): Promise<AiSkill[]> {
  const data = await apiFetch('/api/v1/ai-skills', {
    orgId,
  })
  return (data as any).skills ?? []
}

export function useAiSkills() {
  const { data: org } = useOrganization()

  return useQuery({
    queryKey: [...AI_SKILLS_QUERY_KEY, org?.id],
    queryFn: () => fetchSkills(org!.id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!org?.id,
  })
}

export function useCreateAiSkill() {
  const queryClient = useQueryClient()
  const { data: org } = useOrganization()
  const orgId = org?.id

  return useMutation({
    mutationFn: async (input: {
      slug: string
      name: string
      description?: string
      content: string
      kind: 'SHARED' | 'AGENT'
    }): Promise<AiSkill> => {
      const data = await apiFetch('/api/v1/ai-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        orgId: orgId!,
      })
      return (data as any).skill
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
  const { data: org } = useOrganization()
  const orgId = org?.id

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
      const data = await apiFetch(`/api/v1/ai-skills/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        orgId: orgId!,
      })
      return (data as any).skill
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
  const { data: org } = useOrganization()
  const orgId = org?.id

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiFetch(`/api/v1/ai-skills/${id}`, {
        method: 'DELETE',
        orgId: orgId!,
      })
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_SKILLS_QUERY_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
