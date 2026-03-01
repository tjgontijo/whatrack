'use client'

import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'


interface HistorySyncStatus {
  status: string | null
  progress: number
  error: string | null
  isLoading: boolean
}



async function fetchSyncStatus(configId: string, orgId: string) {
  try {
    const data = await apiFetch(`/api/v1/whatsapp/config/${configId}`, {
      orgId,
    })
    return data as any
  } catch (err) {
    return null
  }
}


/**
 * Hook para rastrear status de sincronização de histórico usando TanStack Query.
 */
export function useHistorySyncStatus(configId?: string): HistorySyncStatus {
  const { data: org } = useOrganization()

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-sync-status', configId, org?.id],
    queryFn: () => fetchSyncStatus(configId!, org!.id),
    enabled: !!configId && !!org?.id,
    refetchInterval: (query) => {
      const status = query.state.data?.historySyncStatus
      // Continua polling se não estiver completo ou falhado
      if (status && !['completed', 'failed'].includes(status)) {
        return 5000 // 5 segundos durante sync
      }
      return 30000 // 30 segundos em repouso
    },
    staleTime: 5000,
  })

  return {
    status: data?.historySyncStatus ?? null,
    progress: data?.historySyncProgress ?? 0,
    error: data?.historySyncError ?? null,
    isLoading,
  }
}
