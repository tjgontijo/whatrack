'use client'

import { useQuery } from '@tanstack/react-query'
import type { SubscriptionResponse, UsageResponse } from '@/schemas/billing/billing-schemas'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'

interface UseBillingSubscriptionReturn {
  subscription: SubscriptionResponse | null
  usage: UsageResponse | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

async function fetchBillingData(
  orgId: string
): Promise<{ subscription: SubscriptionResponse | null; usage: UsageResponse | null }> {
  const [subData, usageData] = await Promise.all([
    apiFetch('/api/v1/billing/subscription', { orgId }),
    apiFetch('/api/v1/billing/usage', { orgId }),
  ])

  // Quando não há subscription, a API retorna { subscription: null }
  // Quando há, retorna o objeto diretamente (sem wrapper)
  const subscription = 'subscription' in subData ? subData.subscription : (subData as SubscriptionResponse)
  const usage = 'usage' in usageData ? usageData.usage : (usageData as UsageResponse)

  return { subscription, usage }
}

/**
 * Hook centralizado com cache (TanStack Query) para evitar múltiplas chamadas redundantes.
 */
export function useBillingSubscription(
  organizationIdOverride?: string | null,
): UseBillingSubscriptionReturn {
  const { data: org, isLoading: orgLoading } = useOrganization()
  const organizationId = organizationIdOverride ?? org?.id

  const query = useQuery({
    queryKey: ['billing', 'subscription-usage', organizationId],
    queryFn: () => fetchBillingData(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })

  return {
    subscription: query.data?.subscription ?? null,
    usage: query.data?.usage ?? null,
    isLoading: organizationIdOverride ? query.isLoading : (query.isLoading && !!organizationId) || orgLoading,
    error: query.error as Error | null,
    refetch: () => query.refetch(),
  }
}
