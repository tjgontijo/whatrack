/**
 * Conversation Metrics Types
 */

export interface ConversationMetricsData {
  conversationId: string

  // Response times (in milliseconds)
  leadAvgResponseTime: number | null
  agentAvgResponseTime: number | null
  leadFastestResponse: number | null

  // Message counts
  messagesFromLead: number
  messagesFromAgent: number
  totalMessages: number
  mediaShared: number

  // Engagement metrics
  avgMessageLength: number | null
  conversationDuration: number | null // ms since first message

  // Basic lead score (0-100)
  basicLeadScore: number | null

  // Timestamps
  lastLeadMessageAt: Date | null
  lastAgentMessageAt: Date | null
}

export interface LeadScoreFactors {
  engagementScore: number // 0-25: Based on message frequency and responsiveness
  responseSpeed: number // 0-25: How quickly they respond
  contentQuality: number // 0-25: Message length and media sharing
  recency: number // 0-25: How recent was the last interaction
}

export interface LeadScoreResult {
  score: number // 0-100
  factors: LeadScoreFactors
  tier: 'HOT' | 'WARM' | 'COLD' | 'INACTIVE'
}

export interface MessageForMetrics {
  id: string
  senderType: 'LEAD' | 'USER' | 'AI' | 'SYSTEM'
  sentAt: Date | null
  content: string | null
  mediaUrl: string | null
}
