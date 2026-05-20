import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/http/api-client'
import type { DealLineItemInput } from '../schemas/deal.schemas'

export function useAddDealItemMutation(dealId: string, organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: DealLineItemInput) => {
      return apiFetch(`/api/v1/deals/${dealId}/line-items`, {
        method: 'POST',
        body: JSON.stringify(data),
        orgId: organizationId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-details', dealId] })
      // No toast here to keep it snappy if needed, or keeping it for feedback
      toast.success('Item adicionado!')
    },
    onError: () => {
      toast.error('Erro ao adicionar item')
    },
  })
}
