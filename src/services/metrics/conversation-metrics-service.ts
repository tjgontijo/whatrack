/**
 * Conversation Metrics Service
 * Calculates and updates metrics for conversations
 */

import { prisma } from '@/lib/prisma'
import { calculateLeadScore } from './lead-score'
import type { ConversationMetricsData, MessageForMetrics, LeadScoreResult } from './types'

/**
 * Calculate metrics for a conversation based on its messages
 */
export async function calculateConversationMetrics(
  conversationId: string
): Promise<ConversationMetricsData> {
  // Get all messages from tickets in this conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      tickets: {
        include: {
          messages: {
            orderBy: { sentAt: 'asc' },
            select: {
              id: true,
              senderType: true,
              sentAt: true,
              content: true,
              mediaUrl: true,
            },
          },
        },
      },
    },
  })

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }

  // Flatten all messages from all tickets
  const messages: MessageForMetrics[] = conversation.tickets.flatMap((ticket) =>
    ticket.messages.map((m) => ({
      id: m.id,
      senderType: m.senderType as 'LEAD' | 'USER' | 'AI' | 'SYSTEM',
      sentAt: m.sentAt,
      content: m.content,
      mediaUrl: m.mediaUrl,
    }))
  )

  return calculateMetricsFromMessages(conversationId, messages)
}

/**
 * Calculate metrics from a list of messages
 */
function calculateMetricsFromMessages(
  conversationId: string,
  messages: MessageForMetrics[]
): ConversationMetricsData {
  // Filter and count by sender type
  const leadMessages = messages.filter((m) => m.senderType === 'LEAD')
  const agentMessages = messages.filter((m) => m.senderType === 'USER' || m.senderType === 'AI')

  // Count messages
  const messagesFromLead = leadMessages.length
  const messagesFromAgent = agentMessages.length
  const totalMessages = messages.length
  const mediaShared = messages.filter((m) => m.mediaUrl !== null).length

  // Calculate response times
  const { leadAvgResponseTime, agentAvgResponseTime, leadFastestResponse } =
    calculateResponseTimes(messages)

  // Calculate average message length (from lead messages only)
  const avgMessageLength = calculateAvgMessageLength(leadMessages)

  // Calculate conversation duration
  const conversationDuration = calculateConversationDuration(messages)

  // Get last message timestamps
  const lastLeadMessageAt =
    leadMessages.length > 0 ? leadMessages[leadMessages.length - 1].sentAt : null
  const lastAgentMessageAt =
    agentMessages.length > 0 ? agentMessages[agentMessages.length - 1].sentAt : null

  const metricsData: ConversationMetricsData = {
    conversationId,
    leadAvgResponseTime,
    agentAvgResponseTime,
    leadFastestResponse,
    messagesFromLead,
    messagesFromAgent,
    totalMessages,
    mediaShared,
    avgMessageLength,
    conversationDuration,
    basicLeadScore: null, // Will be calculated separately
    lastLeadMessageAt,
    lastAgentMessageAt,
  }

  // Calculate lead score
  const scoreResult = calculateLeadScore(metricsData)
  metricsData.basicLeadScore = scoreResult.score

  return metricsData
}

/**
 * Calculate response times from messages
 */
function calculateResponseTimes(messages: MessageForMetrics[]): {
  leadAvgResponseTime: number | null
  agentAvgResponseTime: number | null
  leadFastestResponse: number | null
} {
  const leadResponseTimes: number[] = []
  const agentResponseTimes: number[] = []

  for (let i = 1; i < messages.length; i++) {
    const current = messages[i]
    const previous = messages[i - 1]

    if (!current.sentAt || !previous.sentAt) continue

    const responseTime = new Date(current.sentAt).getTime() - new Date(previous.sentAt).getTime()

    // Skip unreasonably long response times (> 7 days) as they're likely different sessions
    if (responseTime > 7 * 24 * 60 * 60 * 1000) continue

    // Lead responding to agent/AI
    if (
      current.senderType === 'LEAD' &&
      (previous.senderType === 'USER' || previous.senderType === 'AI')
    ) {
      leadResponseTimes.push(responseTime)
    }

    // Agent/AI responding to lead
    if (
      (current.senderType === 'USER' || current.senderType === 'AI') &&
      previous.senderType === 'LEAD'
    ) {
      agentResponseTimes.push(responseTime)
    }
  }

  return {
    leadAvgResponseTime:
      leadResponseTimes.length > 0
        ? Math.round(leadResponseTimes.reduce((a, b) => a + b, 0) / leadResponseTimes.length)
        : null,
    agentAvgResponseTime:
      agentResponseTimes.length > 0
        ? Math.round(agentResponseTimes.reduce((a, b) => a + b, 0) / agentResponseTimes.length)
        : null,
    leadFastestResponse:
      leadResponseTimes.length > 0 ? Math.min(...leadResponseTimes) : null,
  }
}

/**
 * Calculate average message length from lead messages
 */
function calculateAvgMessageLength(leadMessages: MessageForMetrics[]): number | null {
  const lengths = leadMessages
    .filter((m) => m.content !== null)
    .map((m) => m.content!.length)

  if (lengths.length === 0) return null

  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
}

/**
 * Calculate conversation duration from first to last message
 */
function calculateConversationDuration(messages: MessageForMetrics[]): number | null {
  const messagesWithDates = messages.filter((m) => m.sentAt !== null)

  if (messagesWithDates.length < 2) return null

  const firstMessage = messagesWithDates[0]
  const lastMessage = messagesWithDates[messagesWithDates.length - 1]

  return new Date(lastMessage.sentAt!).getTime() - new Date(firstMessage.sentAt!).getTime()
}

/**
 * Update metrics for a conversation in the database
 */
export async function updateConversationMetrics(
  conversationId: string
): Promise<{ metrics: ConversationMetricsData; score: LeadScoreResult }> {
  const metricsData = await calculateConversationMetrics(conversationId)
  const scoreResult = calculateLeadScore(metricsData)

  await prisma.conversationMetrics.upsert({
    where: { conversationId },
    create: {
      conversationId,
      leadAvgResponseTime: metricsData.leadAvgResponseTime,
      agentAvgResponseTime: metricsData.agentAvgResponseTime,
      leadFastestResponse: metricsData.leadFastestResponse,
      messagesFromLead: metricsData.messagesFromLead,
      messagesFromAgent: metricsData.messagesFromAgent,
      totalMessages: metricsData.totalMessages,
      mediaShared: metricsData.mediaShared,
      avgMessageLength: metricsData.avgMessageLength,
      conversationDuration: metricsData.conversationDuration,
      basicLeadScore: scoreResult.score,
      lastLeadMessageAt: metricsData.lastLeadMessageAt,
      lastAgentMessageAt: metricsData.lastAgentMessageAt,
    },
    update: {
      leadAvgResponseTime: metricsData.leadAvgResponseTime,
      agentAvgResponseTime: metricsData.agentAvgResponseTime,
      leadFastestResponse: metricsData.leadFastestResponse,
      messagesFromLead: metricsData.messagesFromLead,
      messagesFromAgent: metricsData.messagesFromAgent,
      totalMessages: metricsData.totalMessages,
      mediaShared: metricsData.mediaShared,
      avgMessageLength: metricsData.avgMessageLength,
      conversationDuration: metricsData.conversationDuration,
      basicLeadScore: scoreResult.score,
      lastLeadMessageAt: metricsData.lastLeadMessageAt,
      lastAgentMessageAt: metricsData.lastAgentMessageAt,
    },
  })

  return { metrics: metricsData, score: scoreResult }
}

/**
 * Get metrics for a conversation
 */
export async function getConversationMetrics(
  conversationId: string
): Promise<{ metrics: ConversationMetricsData; score: LeadScoreResult } | null> {
  const existing = await prisma.conversationMetrics.findUnique({
    where: { conversationId },
  })

  if (!existing) {
    return null
  }

  const metricsData: ConversationMetricsData = {
    conversationId: existing.conversationId,
    leadAvgResponseTime: existing.leadAvgResponseTime,
    agentAvgResponseTime: existing.agentAvgResponseTime,
    leadFastestResponse: existing.leadFastestResponse,
    messagesFromLead: existing.messagesFromLead,
    messagesFromAgent: existing.messagesFromAgent,
    totalMessages: existing.totalMessages,
    mediaShared: existing.mediaShared,
    avgMessageLength: existing.avgMessageLength,
    conversationDuration: existing.conversationDuration,
    basicLeadScore: existing.basicLeadScore,
    lastLeadMessageAt: existing.lastLeadMessageAt,
    lastAgentMessageAt: existing.lastAgentMessageAt,
  }

  const scoreResult = calculateLeadScore(metricsData)

  return { metrics: metricsData, score: scoreResult }
}
