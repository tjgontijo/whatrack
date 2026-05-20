import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/http/api-client'
import { DealItem } from '../types'

export function useDealDetailsQuery(dealId: string, organizationId: string, initialData?: DealItem) {
  return useQuery({
    queryKey: ['deal-details', dealId],
    queryFn: async () => {
      return apiFetch(`/api/v1/deals/${dealId}`, {
        orgId: organizationId,
      }) as Promise<DealItem>
    },
    initialData,
    staleTime: 5000,
  })
}
