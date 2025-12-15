/**
 * Lead Score Calculator
 * Calculates a 0-100 score based on engagement metrics
 */

import type { LeadScoreFactors, LeadScoreResult, ConversationMetricsData } from './types'

const ONE_HOUR_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * ONE_HOUR_MS
const ONE_WEEK_MS = 7 * ONE_DAY_MS

/**
 * Calculate lead score based on conversation metrics
 */
export function calculateLeadScore(metrics: ConversationMetricsData): LeadScoreResult {
  const factors = calculateFactors(metrics)
  const score = Math.round(
    factors.engagementScore +
      factors.responseSpeed +
      factors.contentQuality +
      factors.recency
  )

  return {
    score: Math.min(100, Math.max(0, score)),
    factors,
    tier: getScoreTier(score),
  }
}

function calculateFactors(metrics: ConversationMetricsData): LeadScoreFactors {
  return {
    engagementScore: calculateEngagementScore(metrics),
    responseSpeed: calculateResponseSpeedScore(metrics),
    contentQuality: calculateContentQualityScore(metrics),
    recency: calculateRecencyScore(metrics),
  }
}

/**
 * Engagement Score (0-25)
 * Based on: message count, back-and-forth ratio
 */
function calculateEngagementScore(metrics: ConversationMetricsData): number {
  const { messagesFromLead, messagesFromAgent, totalMessages } = metrics

  if (totalMessages === 0) return 0

  // Base score from message count (up to 10 points)
  // 5+ messages from lead = max points
  const messageCountScore = Math.min(10, messagesFromLead * 2)

  // Back-and-forth ratio (up to 15 points)
  // Ideal is roughly 1:1 or lead talking more
  if (messagesFromAgent === 0) {
    // No agent response yet - give partial credit for lead initiation
    return messageCountScore + (messagesFromLead > 0 ? 5 : 0)
  }

  const ratio = messagesFromLead / messagesFromAgent
  let ratioScore: number
  if (ratio >= 0.5 && ratio <= 2) {
    // Good engagement - lead is responsive
    ratioScore = 15
  } else if (ratio > 2) {
    // Lead is very active - still good
    ratioScore = 12
  } else {
    // Low engagement from lead
    ratioScore = Math.max(0, ratio * 20)
  }

  return messageCountScore + ratioScore
}

/**
 * Response Speed Score (0-25)
 * Based on: average response time from lead
 */
function calculateResponseSpeedScore(metrics: ConversationMetricsData): number {
  const { leadAvgResponseTime } = metrics

  if (leadAvgResponseTime === null) {
    // No response data yet - neutral score
    return 12
  }

  // Under 5 min = 25 points
  // Under 30 min = 20 points
  // Under 2 hours = 15 points
  // Under 24 hours = 10 points
  // Over 24 hours = 5 points
  if (leadAvgResponseTime < 5 * 60 * 1000) return 25
  if (leadAvgResponseTime < 30 * 60 * 1000) return 20
  if (leadAvgResponseTime < 2 * ONE_HOUR_MS) return 15
  if (leadAvgResponseTime < ONE_DAY_MS) return 10
  return 5
}

/**
 * Content Quality Score (0-25)
 * Based on: message length, media sharing
 */
function calculateContentQualityScore(metrics: ConversationMetricsData): number {
  const { avgMessageLength, mediaShared, messagesFromLead } = metrics

  if (messagesFromLead === 0) return 0

  // Message length score (up to 15 points)
  // Longer messages usually indicate interest
  let lengthScore = 0
  if (avgMessageLength !== null) {
    if (avgMessageLength > 100) lengthScore = 15
    else if (avgMessageLength > 50) lengthScore = 12
    else if (avgMessageLength > 20) lengthScore = 8
    else lengthScore = 4
  }

  // Media sharing score (up to 10 points)
  // Sharing media indicates higher engagement
  const mediaScore = Math.min(10, mediaShared * 3)

  return lengthScore + mediaScore
}

/**
 * Recency Score (0-25)
 * Based on: how recent was the last lead message
 */
function calculateRecencyScore(metrics: ConversationMetricsData): number {
  const { lastLeadMessageAt } = metrics

  if (!lastLeadMessageAt) return 0

  const timeSinceLastMessage = Date.now() - new Date(lastLeadMessageAt).getTime()

  // Within 1 hour = 25 points
  // Within 24 hours = 20 points
  // Within 3 days = 15 points
  // Within 1 week = 10 points
  // Over 1 week = 5 points
  // Over 30 days = 0 points
  if (timeSinceLastMessage < ONE_HOUR_MS) return 25
  if (timeSinceLastMessage < ONE_DAY_MS) return 20
  if (timeSinceLastMessage < 3 * ONE_DAY_MS) return 15
  if (timeSinceLastMessage < ONE_WEEK_MS) return 10
  if (timeSinceLastMessage < 30 * ONE_DAY_MS) return 5
  return 0
}

/**
 * Get score tier label
 */
function getScoreTier(score: number): 'HOT' | 'WARM' | 'COLD' | 'INACTIVE' {
  if (score >= 70) return 'HOT'
  if (score >= 40) return 'WARM'
  if (score >= 15) return 'COLD'
  return 'INACTIVE'
}
