/**
 * Hook para obter limites e uso de recursos da organização
 *
 * Usa react-query com cache de 2 minutos.
 * Busca da API /api/v1/billing/usage
 */
import { useQuery } from '@tanstack/react-query'
import type { UsageStats, OrganizationLimits, LimitableResource } from '@/services/billing'

interface UsageResponse {
  usage: UsageStats
  limits: OrganizationLimits
}

interface UseOrganizationLimitsReturn {
  usage: UsageStats | null
  limits: OrganizationLimits | null
  isLoading: boolean
  error: Error | null
  isAtLimit: (resource: LimitableResource) => boolean
  isNearLimit: (resource: LimitableResource, threshold?: number) => boolean
  canAdd: (resource: LimitableResource, quantity?: number) => boolean
  refetch: () => void
}

// Query keys para gerenciamento de cache
export const organizationLimitsKeys = {
  all: ['organization-limits'] as const,
  usage: () => [...organizationLimitsKeys.all, 'usage'] as const,
}

async function fetchUsage(): Promise<UsageResponse | null> {
  const response = await fetch('/api/v1/billing/usage', {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      return null
    }
    throw new Error('Erro ao buscar limites de uso')
  }

  return response.json()
}

export function useOrganizationLimits(): UseOrganizationLimitsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: organizationLimitsKeys.usage(),
    queryFn: fetchUsage,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  })

  const usage = data?.usage ?? null
  const limits = data?.limits ?? null

  /**
   * Verifica se um recurso está no limite
   */
  const isAtLimit = (resource: LimitableResource): boolean => {
    if (!usage) return false
    const stat = usage[resource]
    return stat.used >= stat.limit
  }

  /**
   * Verifica se um recurso está próximo do limite
   * @param threshold - percentual do limite (default: 80%)
   */
  const isNearLimit = (resource: LimitableResource, threshold = 80): boolean => {
    if (!usage) return false
    const stat = usage[resource]
    return stat.percentage >= threshold
  }

  /**
   * Verifica se pode adicionar uma quantidade de recursos
   */
  const canAdd = (resource: LimitableResource, quantity = 1): boolean => {
    if (!usage) return false
    const stat = usage[resource]
    return stat.used + quantity <= stat.limit
  }

  return {
    usage,
    limits,
    isLoading,
    error: error as Error | null,
    isAtLimit,
    isNearLimit,
    canAdd,
    refetch: () => refetch(),
  }
}
