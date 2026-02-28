'use client'

import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/hooks/organization/use-organization'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'

interface HistorySyncStatus {
  status: string | null
  progress: number
  error: string | null
  isLoading: boolean
}

async function fetchSyncStatus(configId: string, orgId: string) {
  const response = await fetch(`/api/v1/whatsapp/config/${configId}`, {
    headers: {
      [ORGANIZATION_HEADER]: orgId,
    },
  })

  if (!response.ok) return null
  return response.json()
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
