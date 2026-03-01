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

/**
 * Fetch subscription + usage data
 */


async function fetchBillingData(orgId: string): Promise<{ subscription: SubscriptionResponse | null; usage: UsageResponse | null }> {
  try {
    const [subData, usageData] = await Promise.all([
      apiFetch('/api/v1/billing/subscription', { orgId }),
      apiFetch('/api/v1/billing/usage', { orgId }),
    ])
    return {
      subscription: subData as SubscriptionResponse,
      usage: usageData as UsageResponse
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      return { subscription: null, usage: null }
    }
    throw err
  }
}


/**
 * Hook centralizado com cache (TanStack Query) para evitar múltiplas chamadas redundantes.
 */
export function useBillingSubscription(): UseBillingSubscriptionReturn {
  const { data: org, isLoading: orgLoading } = useOrganization()

  // Debug: log org state
  if (typeof window !== 'undefined') {
    console.debug('[useBillingSubscription] org:', org, 'orgLoading:', orgLoading)
  }

  const query = useQuery({
    queryKey: ['billing', 'subscription-usage', org?.id],
    queryFn: () => {
      console.debug('[useBillingSubscription] Fetching with orgId:', org?.id)
      return fetchBillingData(org!.id)
    },
    enabled: !!org?.id,
    staleTime: 5 * 60 * 1000, // 5 min de cache
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })

  return {
    subscription: query.data?.subscription ?? null,
    usage: query.data?.usage ?? null,
    isLoading: (query.isLoading && !!org?.id) || orgLoading,
    error: query.error as Error | null,
    refetch: () => query.refetch(),
  }
}
