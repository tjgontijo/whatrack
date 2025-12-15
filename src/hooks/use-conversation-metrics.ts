'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface ConversationMetrics {
  leadAvgResponseTime: number | null
  agentAvgResponseTime: number | null
  leadFastestResponse: number | null
  messagesFromLead: number
  messagesFromAgent: number
  totalMessages: number
  mediaShared: number
  avgMessageLength: number | null
  conversationDuration: number | null
  lastLeadMessageAt: string | null
  lastAgentMessageAt: string | null
}

export interface LeadScoreFactors {
  engagementScore: number
  responseSpeed: number
  contentQuality: number
  recency: number
}

export interface LeadScore {
  score: number
  tier: 'HOT' | 'WARM' | 'COLD' | 'INACTIVE'
  factors: LeadScoreFactors
}

export interface ConversationMetricsResponse {
  hasMetrics: boolean
  metrics: ConversationMetrics | null
  score: LeadScore | null
}

async function fetchConversationMetrics(
  conversationId: string
): Promise<ConversationMetricsResponse> {
  const response = await fetch(`/api/v1/conversations/${conversationId}/metrics`)

  if (!response.ok) {
    throw new Error('Failed to fetch conversation metrics')
  }

  return response.json()
}

async function recalculateConversationMetrics(
  conversationId: string
): Promise<ConversationMetricsResponse & { success: boolean }> {
  const response = await fetch(`/api/v1/conversations/${conversationId}/metrics`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to recalculate metrics')
  }

  return response.json()
}

export function useConversationMetrics(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-metrics', conversationId],
    queryFn: () => {
      if (!conversationId) throw new Error('No conversation ID')
      return fetchConversationMetrics(conversationId)
    },
    enabled: !!conversationId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useRecalculateMetrics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: recalculateConversationMetrics,
    onSuccess: (data, conversationId) => {
      queryClient.setQueryData(['conversation-metrics', conversationId], data)
    },
  })
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return '-'

  if (ms < 60 * 1000) {
    return `${Math.round(ms / 1000)}s`
  }
  if (ms < 60 * 60 * 1000) {
    return `${Math.round(ms / (60 * 1000))}min`
  }
  if (ms < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const mins = Math.round((ms % (60 * 60 * 1000)) / (60 * 1000))
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  return `${days}d`
}

/**
 * Get score tier badge color
 */
export function getScoreTierColor(tier: LeadScore['tier']): string {
  switch (tier) {
    case 'HOT':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'WARM':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'COLD':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'INACTIVE':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}
