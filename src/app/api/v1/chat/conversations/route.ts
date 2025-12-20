/**
 * API Routes - /api/v1/chat/conversations
 *
 * GET   - List conversations for an instance with optional filters
 */

import { NextResponse } from 'next/server'
import { getOrSyncUser, getCurrentOrganization } from '@/server/auth/server'
import { prisma } from '@/lib/prisma'
import type { ConversationStatus } from '@prisma/client'

/**
 * GET - List conversations with optional filters
 * Query params:
 * - instanceId (required): Filter by WhatsApp instance
 * - status (optional): Filter by status (OPEN, PENDING, RESOLVED, SNOOZED)
 */
export async function GET(request: Request) {
  try {
    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const instanceId = searchParams.get('instanceId')
    const statusParam = searchParams.get('status')

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    // Validate status parameter if provided
    const validStatuses: ConversationStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'SNOOZED']
    const status = statusParam && validStatuses.includes(statusParam as ConversationStatus)
      ? (statusParam as ConversationStatus)
      : undefined

    const conversations = await prisma.whatsappConversation.findMany({
      where: {
        organizationId: organization.id,
        instanceId,
        ...(status && { status }),
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        tickets: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return NextResponse.json(
      conversations.map((conv) => ({
        id: conv.id,
        status: conv.status,
        priority: conv.priority,
        unreadCount: conv.unreadCount,
        lastMessageAt: conv.lastMessageAt,
        lead: conv.lead,
        lastTicketId: conv.tickets[0]?.id || null,
      }))
    )
  } catch (error) {
    console.error('Failed to list conversations:', error)
    return NextResponse.json({ error: 'Failed to list conversations' }, { status: 500 })
  }
}
