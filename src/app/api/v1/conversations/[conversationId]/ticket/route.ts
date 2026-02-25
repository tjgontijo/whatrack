import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

/**
 * GET /api/v1/conversations/:conversationId/ticket
 *
 * Returns the open ticket for a conversation.
 * Returns 404 if no open ticket exists.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const access = await validatePermissionAccess(request, 'view:tickets')

    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await params

    // Fetch conversation to verify it belongs to the organization
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        lead: {
          organizationId: access.organizationId,
        },
      },
      select: {
        id: true,
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
    }

    // Fetch the open ticket for this conversation
    const ticket = await prisma.ticket.findFirst({
      where: {
        conversationId,
        organizationId: access.organizationId,
        status: 'open',
      },
      select: {
        id: true,
        status: true,
        windowOpen: true,
        windowExpiresAt: true,
        dealValue: true,
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
            isClosed: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tracking: {
          select: {
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            sourceType: true,
            ctwaclid: true,
            referrerUrl: true,
            landingPage: true,
          },
        },
        closedReason: true,
        closedAt: true,
        messagesCount: true,
        inboundMessagesCount: true,
        outboundMessagesCount: true,
        firstResponseTimeSec: true,
        resolutionTimeSec: true,
        createdAt: true,
        conversation: {
          select: {
            lead: {
              select: {
                totalTickets: true,
                lifetimeValue: true,
                firstMessageAt: true,
              },
            },
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(null, { status: 404 })
    }

    // Format response
    return NextResponse.json(
      {
        id: ticket.id,
        status: ticket.status,
        windowOpen: ticket.windowOpen,
        windowExpiresAt: ticket.windowExpiresAt?.toISOString() || null,
        dealValue: ticket.dealValue ? ticket.dealValue.toString() : null,
        stage: ticket.stage,
        assignee: ticket.assignee,
        tracking: ticket.tracking,
        closedReason: ticket.closedReason,
        closedAt: ticket.closedAt?.toISOString() || null,
        kpis: {
          messagesCount: ticket.messagesCount,
          inboundMessagesCount: ticket.inboundMessagesCount,
          outboundMessagesCount: ticket.outboundMessagesCount,
          firstResponseTimeSec: ticket.firstResponseTimeSec,
          resolutionTimeSec: ticket.resolutionTimeSec,
          createdAt: ticket.createdAt.toISOString(),
        },
        leadInsights: {
          totalTickets: ticket.conversation.lead.totalTickets,
          lifetimeValue: ticket.conversation.lead.lifetimeValue
            ? ticket.conversation.lead.lifetimeValue.toString()
            : '0',
          firstMessageAt: ticket.conversation.lead.firstMessageAt?.toISOString() || null,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Conversation Ticket] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
  }
}
