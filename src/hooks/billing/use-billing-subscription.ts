'use client'

import { useQuery } from '@tanstack/react-query'
import type { SubscriptionResponse } from '@/schemas/billing/billing-schemas'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'

interface UseBillingSubscriptionReturn {
  subscription: SubscriptionResponse | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

async function fetchBillingData(orgId: string): Promise<{ subscription: SubscriptionResponse | null }> {
  const subData = await apiFetch('/api/v1/billing/subscription', { orgId })

  const subscription = 'subscription' in subData ? subData.subscription : (subData as SubscriptionResponse)

  return { subscription }
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
    refetchOnMount: 'always',
    refetchInterval: (query) =>
      query.state.data?.subscription?.status === 'PENDING' ? 5 * 1000 : false,
    retry: 1,
  })

  return {
    subscription: query.data?.subscription ?? null,
    isLoading: organizationIdOverride ? query.isLoading : (query.isLoading && !!organizationId) || orgLoading,
    error: query.error as Error | null,
    refetch: () => query.refetch(),
  }
}
