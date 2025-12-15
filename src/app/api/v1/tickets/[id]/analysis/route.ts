/**
 * API Routes - /api/v1/tickets/[id]/analysis
 *
 * GET   - Get cached analysis for a ticket
 * POST  - Trigger new analysis (consumes AI credits)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrSyncUser, getCurrentOrganization } from '@/lib/auth/server'
import { analyzeTicket, type TicketAnalysisResult } from '@/services/ai/ticket-analyzer'
import { aiCreditsService } from '@/services/credits/ai-credits-service'
import { AI_CREDIT_COSTS } from '@/services/credits/types'

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * GET - Get cached analysis for a ticket
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

    // Get ticket with analysis
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        conversation: {
          organizationId: organization.id,
        },
      },
      include: {
        analysis: true,
        _count: {
          select: { messages: true },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (!ticket.analysis) {
      return NextResponse.json({
        hasAnalysis: false,
        messageCount: ticket._count.messages,
        analysis: null,
      })
    }

    return NextResponse.json({
      hasAnalysis: true,
      messageCount: ticket._count.messages,
      isStale: ticket._count.messages > ticket.analysis.messageCount,
      analysis: {
        sentiment: ticket.analysis.sentiment,
        sentimentScore: ticket.analysis.sentimentScore,
        buyingSignals: ticket.analysis.buyingSignals,
        objectionSignals: ticket.analysis.objectionSignals,
        aiLeadScore: ticket.analysis.aiLeadScore,
        scoreFactors: ticket.analysis.scoreFactors,
        summary: ticket.analysis.summary,
        tags: ticket.analysis.tags,
        outcome: ticket.analysis.outcome,
        outcomeReason: ticket.analysis.outcomeReason,
        analyzedAt: ticket.analysis.analyzedAt,
        creditsUsed: ticket.analysis.creditsUsed,
      },
    })
  } catch (error) {
    console.error('Failed to get ticket analysis:', error)
    return NextResponse.json({ error: 'Failed to get analysis' }, { status: 500 })
  }
}

/**
 * POST - Trigger new analysis (consumes AI credits)
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

    // Check AI credits
    const hasCredits = await aiCreditsService.hasCredits(organization.id, 'ticket_analysis')
    if (!hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient AI credits', code: 'NO_CREDITS' },
        { status: 402 }
      )
    }

    // Get ticket with messages
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        conversation: {
          organizationId: organization.id,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            content: true,
            senderType: true,
            createdAt: true,
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages to analyze', code: 'NO_MESSAGES' },
        { status: 400 }
      )
    }

    // Run analysis
    const result: TicketAnalysisResult = await analyzeTicket({
      ticketId: id,
      messages: ticket.messages,
    })

    // Save analysis to database
    const analysis = await prisma.ticketAnalysis.upsert({
      where: { ticketId: id },
      create: {
        ticketId: id,
        sentiment: result.sentiment,
        sentimentScore: result.sentimentScore,
        buyingSignals: result.buyingSignals,
        objectionSignals: result.objectionSignals,
        aiLeadScore: result.aiLeadScore,
        scoreFactors: result.scoreFactors,
        summary: result.summary,
        tags: result.tags,
        outcome: result.outcome,
        outcomeReason: result.outcomeReason,
        analyzedAt: new Date(),
        messageCount: ticket.messages.length,
        creditsUsed: AI_CREDIT_COSTS.ticket_analysis,
      },
      update: {
        sentiment: result.sentiment,
        sentimentScore: result.sentimentScore,
        buyingSignals: result.buyingSignals,
        objectionSignals: result.objectionSignals,
        aiLeadScore: result.aiLeadScore,
        scoreFactors: result.scoreFactors,
        summary: result.summary,
        tags: result.tags,
        outcome: result.outcome,
        outcomeReason: result.outcomeReason,
        analyzedAt: new Date(),
        messageCount: ticket.messages.length,
        creditsUsed: AI_CREDIT_COSTS.ticket_analysis,
      },
    })

    // Consume credits
    await aiCreditsService.consumeCredits({
      organizationId: organization.id,
      amount: AI_CREDIT_COSTS.ticket_analysis,
      action: 'ticket_analysis',
      ticketId: id,
      triggeredBy: user.id,
    })

    return NextResponse.json({
      success: true,
      analysis: {
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        buyingSignals: analysis.buyingSignals,
        objectionSignals: analysis.objectionSignals,
        aiLeadScore: analysis.aiLeadScore,
        scoreFactors: analysis.scoreFactors,
        summary: analysis.summary,
        tags: analysis.tags,
        outcome: analysis.outcome,
        outcomeReason: analysis.outcomeReason,
        analyzedAt: analysis.analyzedAt,
        creditsUsed: analysis.creditsUsed,
      },
    })
  } catch (error) {
    console.error('Failed to analyze ticket:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze ticket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
