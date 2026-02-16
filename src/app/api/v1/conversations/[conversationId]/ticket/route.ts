import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { hasPermission } from '@/lib/auth/rbac/roles'

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
    const access = await validateFullAccess(request)

    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!hasPermission(access.role, 'view:tickets')) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar tickets' },
        { status: 403 }
      )
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
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Conversation Ticket] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}
