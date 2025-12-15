/**
 * AI Credits Types
 * Defines types and constants for the AI credits system
 */

export type AIAction = 'followup_generation' | 'ticket_analysis' | 'response_suggestion'

export const AI_CREDIT_COSTS: Record<AIAction, number> = {
  followup_generation: 1,
  ticket_analysis: 2,
  response_suggestion: 1,
}

export interface ConsumeCreditsParams {
  organizationId: string
  amount: number
  action: AIAction
  ticketId?: string
  contactPhone?: string
  metadata?: {
    model?: string
    inputTokens?: number
    outputTokens?: number
    latencyMs?: number
  }
  triggeredBy: string // "system" or "user:{userId}"
}

export interface CreditsInfo {
  balance: number
  usedThisCycle: number
  quota: number
  planName: string
  nextBillingDate?: Date
}

export interface CanUseCreditsResult {
  allowed: boolean
  reason?: 'no_credits' | 'subscription_inactive' | 'plan_no_ai'
}

export interface ConsumeCreditsResult {
  success: boolean
  newBalance: number
}
