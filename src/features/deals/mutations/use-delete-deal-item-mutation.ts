import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/http/api-client'

export function useDeleteDealItemMutation(dealId: string, organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lineItemId: string) => {
      return apiFetch(`/api/v1/deals/${dealId}/line-items/${lineItemId}`, {
        method: 'DELETE',
        orgId: organizationId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-details', dealId] })
      toast.success('Item removido')
    },
    onError: () => {
      toast.error('Erro ao remover item')
    },
  })
}
