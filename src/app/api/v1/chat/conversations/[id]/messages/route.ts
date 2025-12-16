/**
 * API Routes - /api/v1/chat/conversations/[id]/messages
 *
 * GET  - List messages for a conversation
 * POST - Send a new message
 */

import { NextResponse } from 'next/server'
import { getOrSyncUser, getCurrentOrganization } from '@/server/auth/server'
import { prisma } from '@/lib/prisma'
import { createMessage, resolveTicket } from '@/services/chat'
import { sendTextMessage } from '@/services/whatsapp/uazapi/send-message'

/**
 * GET - List messages for a conversation
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

    const { id: conversationId } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Verify conversation belongs to organization
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: organization.id,
      },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const ticketId = conversation.tickets[0]?.id

    if (!ticketId) {
      return NextResponse.json({ messages: [], nextCursor: null })
    }

    // Calculate 7 days ago for message limit
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Fetch messages from the ticket (only last 7 days)
    const messages = await prisma.message.findMany({
      where: {
        ticketId,
        sentAt: { gte: sevenDaysAgo },
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        ticketId: true,
        senderType: true,
        senderId: true,
        senderName: true,
        messageType: true,
        content: true,
        mediaUrl: true,
        mediaType: true,
        fileName: true,
        sentAt: true,
        status: true,
      },
    })

    const hasMore = messages.length > limit
    const items = hasMore ? messages.slice(0, -1) : messages
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    // Reverse to show oldest first
    const sortedMessages = items.reverse()

    return NextResponse.json({
      messages: sortedMessages.map((msg) => ({
        id: msg.id,
        ticketId: msg.ticketId,
        senderType: msg.senderType,
        senderId: msg.senderId,
        senderName: msg.senderName,
        messageType: msg.messageType,
        content: msg.content,
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
        fileName: msg.fileName,
        sentAt: msg.sentAt,
        status: msg.status,
      })),
      nextCursor,
    })
  } catch (error) {
    console.error('Failed to list messages:', error)
    return NextResponse.json({ error: 'Failed to list messages' }, { status: 500 })
  }
}

/**
 * POST - Send a new message
 */
export async function POST(
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

    const { id: conversationId } = await params
    const body = await request.json()

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Get conversation with lead
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: organization.id,
      },
      include: {
        lead: true,
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Get instance for sending message
    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        instanceId: conversation.instanceId,
        organizationId: organization.id,
      },
    })

    // Resolve ticket (find open or create new)
    const ticket = await resolveTicket(conversation.id)

    // Create message in database
    const message = await createMessage({
      ticketId: ticket.id,
      senderType: 'USER',
      senderId: user.id,
      senderName: user.name || user.email || 'Atendente',
      messageType: 'TEXT',
      content: body.content,
      mediaUrl: null,
      mediaType: null,
      fileName: null,
      sentAt: new Date(),
    })

    // Send message via WhatsApp (UAZAPI)
    if (instance && conversation.lead?.remoteJid) {
      try {
        const phone = conversation.lead.remoteJid.replace('@s.whatsapp.net', '')
        await sendTextMessage({
          phone,
          message: body.content,
        })
      } catch (sendError) {
        console.error('Failed to send WhatsApp message:', sendError)
        // Don't fail the request, message is saved locally
      }
    }

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    return NextResponse.json({
      id: message.id,
      ticketId: message.ticketId,
      senderType: message.senderType,
      senderId: message.senderId,
      senderName: message.senderName,
      messageType: message.messageType,
      content: message.content,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      sentAt: message.sentAt,
      status: message.status,
    })
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
