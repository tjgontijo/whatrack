/**
 * API Routes - /api/v1/conversations/[id]/metrics
 *
 * GET   - Get metrics for a conversation
 * POST  - Recalculate metrics for a conversation
 */

import { NextResponse } from 'next/server'
import { getOrSyncUser, getCurrentOrganization } from '@/server/auth/server'
import { getConversationMetrics, updateConversationMetrics } from '@/services/metrics'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * GET - Get cached metrics for a conversation
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Verify conversation belongs to this organization
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const result = await getConversationMetrics(id)

    if (!result) {
      return NextResponse.json({
        hasMetrics: false,
        metrics: null,
        score: null,
      })
    }

    return NextResponse.json({
      hasMetrics: true,
      metrics: {
        leadAvgResponseTime: result.metrics.leadAvgResponseTime,
        agentAvgResponseTime: result.metrics.agentAvgResponseTime,
        leadFastestResponse: result.metrics.leadFastestResponse,
        messagesFromLead: result.metrics.messagesFromLead,
        messagesFromAgent: result.metrics.messagesFromAgent,
        totalMessages: result.metrics.totalMessages,
        mediaShared: result.metrics.mediaShared,
        avgMessageLength: result.metrics.avgMessageLength,
        conversationDuration: result.metrics.conversationDuration,
        lastLeadMessageAt: result.metrics.lastLeadMessageAt,
        lastAgentMessageAt: result.metrics.lastAgentMessageAt,
      },
      score: {
        score: result.score.score,
        tier: result.score.tier,
        factors: result.score.factors,
      },
    })
  } catch (error) {
    console.error('Failed to get conversation metrics:', error)
    return NextResponse.json({ error: 'Failed to get metrics' }, { status: 500 })
  }
}

/**
 * POST - Recalculate metrics for a conversation
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Verify conversation belongs to this organization
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Recalculate metrics
    const result = await updateConversationMetrics(id)

    return NextResponse.json({
      success: true,
      metrics: {
        leadAvgResponseTime: result.metrics.leadAvgResponseTime,
        agentAvgResponseTime: result.metrics.agentAvgResponseTime,
        leadFastestResponse: result.metrics.leadFastestResponse,
        messagesFromLead: result.metrics.messagesFromLead,
        messagesFromAgent: result.metrics.messagesFromAgent,
        totalMessages: result.metrics.totalMessages,
        mediaShared: result.metrics.mediaShared,
        avgMessageLength: result.metrics.avgMessageLength,
        conversationDuration: result.metrics.conversationDuration,
        lastLeadMessageAt: result.metrics.lastLeadMessageAt,
        lastAgentMessageAt: result.metrics.lastAgentMessageAt,
      },
      score: {
        score: result.score.score,
        tier: result.score.tier,
        factors: result.score.factors,
      },
    })
  } catch (error) {
    console.error('Failed to recalculate conversation metrics:', error)
    const message = error instanceof Error ? error.message : 'Failed to calculate metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
