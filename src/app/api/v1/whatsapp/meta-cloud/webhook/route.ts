/**
 * Meta Cloud WhatsApp Webhook
 * GET - Verification (hub.mode, hub.verify_token, hub.challenge)
 * POST - Receive events (messages, status updates)
 */

import { NextResponse } from 'next/server'
import { verifyMetaWebhook, handleMetaWebhook } from '@/services/whatsapp/meta-cloud'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/whatsapp/meta-cloud/webhook
 * Webhook verification endpoint for Meta
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('[meta-cloud/webhook] GET verification:', { mode, token: token ? '***' : null })

  const result = verifyMetaWebhook({ mode, token, challenge })

  if (result.success) {
    // Meta expects the challenge as plain text response
    return new Response(result.challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.error('[meta-cloud/webhook] Verification failed:', result.error)
  return NextResponse.json({ error: result.error }, { status: 403 })
}

/**
 * POST /api/v1/whatsapp/meta-cloud/webhook
 * Receive webhook events from Meta (messages, status updates)
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json()

    console.log('[meta-cloud/webhook] POST received:', JSON.stringify(payload).slice(0, 500))

    const result = await handleMetaWebhook(payload)

    if (!result.success) {
      console.error('[meta-cloud/webhook] Handler failed:', result.error)
      // Always return 200 to Meta to avoid retries for invalid payloads
      return NextResponse.json({ received: true, error: result.error })
    }

    // Process messages - upsert Lead, Conversation, Ticket, Message
    for (const msg of result.messages) {
      await processIncomingMessage(msg)
    }

    // Process status updates - update CampaignRecipient status
    for (const status of result.statuses) {
      await processStatusUpdate(status)
    }

    return NextResponse.json({
      received: true,
      messagesProcessed: result.messages.length,
      statusesProcessed: result.statuses.length,
    })
  } catch (error) {
    console.error('[meta-cloud/webhook] POST error:', error)
    // Always return 200 to prevent Meta from retrying
    return NextResponse.json({ received: true, error: 'Internal error' })
  }
}

/**
 * Process incoming message - creates Lead, Conversation, Ticket, Message
 */
async function processIncomingMessage(msg: {
  organizationId: string
  phoneNumberId: string
  messageId: string
  from: string
  timestamp: string
  type: string
  text?: string
  contact?: { name: string; waId: string }
}) {
  const phone = `+${msg.from}`
  const remoteJid = `${msg.from}@s.whatsapp.net`

  try {
    // 1. Upsert Lead
    const lead = await prisma.lead.upsert({
      where: {
        organizationId_remoteJid: {
          organizationId: msg.organizationId,
          remoteJid,
        },
      },
      update: {
        name: msg.contact?.name || undefined,
        phone,
      },
      create: {
        organizationId: msg.organizationId,
        name: msg.contact?.name || null,
        phone,
        remoteJid,
        firstSource: 'whatsapp_meta_cloud',
      },
    })

    // 2. Upsert Conversation (N:1 with Lead per instance)
    let conversation = await prisma.conversation.findUnique({
      where: {
        leadId_instanceId: {
          leadId: lead.id,
          instanceId: msg.phoneNumberId,
        },
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          organizationId: msg.organizationId,
          leadId: lead.id,
          instanceId: msg.phoneNumberId,
          status: 'OPEN',
          priority: 'MEDIUM',
        },
      })
    }

    // 3. Find or create open Ticket
    let ticket = await prisma.ticket.findFirst({
      where: {
        conversationId: conversation.id,
        status: 'OPEN',
      },
    })

    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          organizationId: msg.organizationId,
          conversationId: conversation.id,
          leadId: lead.id,
          status: 'OPEN',
        },
      })
    }

    // 4. Create Message
    const sentAt = new Date(parseInt(msg.timestamp) * 1000)

    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        senderType: 'LEAD',
        senderId: lead.id,
        senderName: msg.contact?.name || phone,
        messageType: msg.type.toUpperCase(),
        content: msg.text || null,
        status: 'DELIVERED',
        sentAt,
      },
    })

    // 5. Update conversation lastMessageAt and unreadCount
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: sentAt,
        unreadCount: { increment: 1 },
        status: 'OPEN',
      },
    })

    console.log('[meta-cloud/webhook] Message processed:', {
      leadId: lead.id,
      conversationId: conversation.id,
      ticketId: ticket.id,
      messageId: msg.messageId,
    })
  } catch (error) {
    console.error('[meta-cloud/webhook] Error processing message:', error)
  }
}

/**
 * Process status update - updates CampaignRecipient status
 */
async function processStatusUpdate(status: {
  organizationId: string
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipientId: string
  error?: { code: number; title: string }
}) {
  try {
    // Update CampaignRecipient if exists
    const recipient = await prisma.campaignRecipient.findFirst({
      where: { messageId: status.messageId },
    })

    if (recipient) {
      const updateData: Record<string, unknown> = {}
      const statusTimestamp = new Date(parseInt(status.timestamp) * 1000)

      switch (status.status) {
        case 'sent':
          updateData.status = 'SENT'
          updateData.sentAt = statusTimestamp
          break
        case 'delivered':
          updateData.status = 'DELIVERED'
          updateData.deliveredAt = statusTimestamp
          break
        case 'read':
          updateData.status = 'READ'
          updateData.readAt = statusTimestamp
          break
        case 'failed':
          updateData.status = 'FAILED'
          updateData.failedAt = statusTimestamp
          updateData.errorCode = status.error?.code?.toString()
          updateData.errorMessage = status.error?.title
          break
      }

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: updateData,
      })

      // Update campaign metrics
      await updateCampaignMetrics(recipient.campaignId, status.status)
    }

    console.log('[meta-cloud/webhook] Status update processed:', {
      messageId: status.messageId,
      status: status.status,
      hasRecipient: !!recipient,
    })
  } catch (error) {
    console.error('[meta-cloud/webhook] Error processing status:', error)
  }
}

/**
 * Update campaign metrics based on status
 */
async function updateCampaignMetrics(
  campaignId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed'
) {
  const updateData: Record<string, { increment: number }> = {}

  switch (status) {
    case 'sent':
      updateData.sent = { increment: 1 }
      break
    case 'delivered':
      updateData.delivered = { increment: 1 }
      break
    case 'read':
      updateData.read = { increment: 1 }
      break
    case 'failed':
      updateData.failed = { increment: 1 }
      break
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: updateData,
  })
}
