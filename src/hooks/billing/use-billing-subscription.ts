'use client'

import { useQuery } from '@tanstack/react-query'
import type { SubscriptionResponse, UsageResponse } from '@/schemas/billing/billing-schemas'
import { useOrganization } from '@/hooks/organization/use-organization'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'

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
  const headers = {
    [ORGANIZATION_HEADER]: orgId,
  }

  const [subRes, usageRes] = await Promise.all([
    fetch('/api/v1/billing/subscription', { headers }),
    fetch('/api/v1/billing/usage', { headers }),
  ])

  // If subscription returns 404, it's expected (no subscription yet)
  if (subRes.status === 404) {
    return { subscription: null, usage: null }
  }

  if (!subRes.ok || !usageRes.ok) {
    throw new Error(`Billing fetch failed: sub=${subRes.status}, usage=${usageRes.status}`)
  }

  const [subData, usageData] = await Promise.all([subRes.json(), usageRes.json()])
  return { subscription: subData, usage: usageData }
}

/**
 * Hook centralizado com cache (TanStack Query) para evitar múltiplas chamadas redundantes.
 */
export function useBillingSubscription(): UseBillingSubscriptionReturn {
  const { data: org } = useOrganization()

  const query = useQuery({
    queryKey: ['billing', 'subscription-usage', org?.id],
    queryFn: () => fetchBillingData(org!.id),
    enabled: !!org?.id,
    staleTime: 5 * 60 * 1000, // 5 min de cache
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })

  return {
    subscription: query.data?.subscription ?? null,
    usage: query.data?.usage ?? null,
    isLoading: query.isLoading && !!org?.id,
    error: query.error as Error | null,
    refetch: () => query.refetch(),
  }
}
