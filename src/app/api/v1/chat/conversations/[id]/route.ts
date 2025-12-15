/**
 * API Routes - /api/v1/chat/conversations/[id]
 *
 * GET   - Get conversation details
 * PATCH - Update conversation (status, priority, assignee)
 */

import { NextResponse } from 'next/server'
import { getOrSyncUser, getCurrentOrganization } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

/**
 * GET - Get conversation details with lead and instance info
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const { id } = await params

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            mail: true,
          },
        },
        tickets: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Get instance separately
    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        instanceId: conversation.instanceId,
        organizationId: organization.id,
      },
      select: {
        id: true,
        instanceId: true,
        label: true,
        phone: true,
      },
    })

    return NextResponse.json({
      id: conversation.id,
      status: conversation.status,
      priority: conversation.priority,
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessageAt,
      contact: conversation.lead,
      instance,
      lastTicketId: conversation.tickets[0]?.id || null,
    })
  } catch (error) {
    console.error('Failed to get conversation:', error)
    return NextResponse.json({ error: 'Failed to get conversation' }, { status: 500 })
  }
}

/**
 * PATCH - Update conversation (status, priority, assignee)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrSyncUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentOrganization(request)
    if (!organization) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify conversation belongs to organization
    const existing = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.status) {
      updateData.status = body.status
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority
    }
    if (body.assigneeId !== undefined) {
      updateData.assigneeId = body.assigneeId
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            mail: true,
          },
        },
      },
    })

    // Get instance separately
    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        instanceId: conversation.instanceId,
        organizationId: organization.id,
      },
      select: {
        id: true,
        instanceId: true,
        label: true,
        phone: true,
      },
    })

    return NextResponse.json({
      id: conversation.id,
      status: conversation.status,
      priority: conversation.priority,
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessageAt,
      contact: conversation.lead,
      instance,
    })
  } catch (error) {
    console.error('Failed to update conversation:', error)
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
  }
}
