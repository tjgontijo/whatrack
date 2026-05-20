import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/http/api-client'
import { CloseDealInput } from '../schemas/deal.schemas'

export function useCloseDealMutation(dealId: string, organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CloseDealInput) => {
      return apiFetch(`/api/v1/deals/${dealId}/close`, {
        method: 'POST',
        body: JSON.stringify(data),
        orgId: organizationId,
      })
    },
    onSuccess: (data: { status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['deal-details', dealId] })
      queryClient.invalidateQueries({ queryKey: ['deals'] }) // Refresh kanban too
      
      const isWon = data.status === 'closed_won'
      if (isWon) {
        toast.success('Venda concluída! Tracking enviado para a Meta.')
      } else {
        toast.success('Negociação encerrada.')
      }
    },
    onError: () => {
      toast.error('Erro ao fechar deal')
    },
  })
}
