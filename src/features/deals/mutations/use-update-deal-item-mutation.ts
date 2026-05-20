import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/http/api-client'
import type { DealLineItemInput } from '../schemas/deal.schemas'

export function useUpdateDealItemMutation(dealId: string, organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lineItemId, data }: { lineItemId: string; data: Partial<DealLineItemInput> }) => {
      return apiFetch(`/api/v1/deals/${dealId}/line-items/${lineItemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        orgId: organizationId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-details', dealId] })
    },
    onError: () => {
      toast.error('Erro ao atualizar item')
    },
  })
}
