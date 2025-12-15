/**
 * React Query hooks for Ticket Analysis API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query keys for cache management
export const ticketAnalysisKeys = {
  all: ['ticketAnalysis'] as const,
  details: () => [...ticketAnalysisKeys.all, 'detail'] as const,
  detail: (ticketId: string) => [...ticketAnalysisKeys.details(), ticketId] as const,
}

// Types
export interface TicketAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated'
  sentimentScore: number
  buyingSignals: string[]
  objectionSignals: string[]
  aiLeadScore: number
  scoreFactors: {
    engagement: number
    intent: number
    timing: number
    fit: number
  }
  summary: string
  tags: string[]
  outcome: 'won' | 'lost' | 'abandoned' | 'follow_up' | 'negotiating' | null
  outcomeReason: string | null
  analyzedAt: string
  creditsUsed: number
}

export interface TicketAnalysisResponse {
  hasAnalysis: boolean
  messageCount: number
  isStale?: boolean
  analysis: TicketAnalysis | null
}

// API functions
async function getTicketAnalysis(ticketId: string): Promise<TicketAnalysisResponse> {
  const res = await fetch(`/api/v1/tickets/${ticketId}/analysis`)
  if (!res.ok) {
    throw new Error('Failed to fetch ticket analysis')
  }
  return res.json()
}

async function triggerAnalysis(
  ticketId: string
): Promise<{ success: boolean; analysis: TicketAnalysis }> {
  const res = await fetch(`/api/v1/tickets/${ticketId}/analysis`, {
    method: 'POST',
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    if (error.code === 'NO_CREDITS') {
      throw new Error('Créditos de IA insuficientes')
    }
    if (error.code === 'NO_MESSAGES') {
      throw new Error('Nenhuma mensagem para analisar')
    }
    throw new Error(error.error || 'Failed to analyze ticket')
  }
  return res.json()
}

/**
 * Fetch ticket analysis
 */
export function useTicketAnalysis(ticketId: string | undefined) {
  return useQuery({
    queryKey: ticketAnalysisKeys.detail(ticketId!),
    queryFn: () => getTicketAnalysis(ticketId!),
    enabled: !!ticketId,
    staleTime: 60000, // Consider fresh for 1 minute
  })
}

/**
 * Trigger new analysis for a ticket
 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ticketId: string) => triggerAnalysis(ticketId),
    onSuccess: (data, ticketId) => {
      // Update cache with new analysis
      queryClient.setQueryData(ticketAnalysisKeys.detail(ticketId), {
        hasAnalysis: true,
        messageCount: 0, // Will be updated on next fetch
        isStale: false,
        analysis: data.analysis,
      })
      // Also invalidate to get fresh data
      void queryClient.invalidateQueries({
        queryKey: ticketAnalysisKeys.detail(ticketId),
      })
    },
  })
}
