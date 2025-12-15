import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  upsertLead,
  upsertConversation,
  resolveTicket,
  createMessage,
  updateConversationLastMessage,
} from '@/services/chat'
import {
  publishNewMessage,
  publishConversationUpdate,
} from '@/lib/centrifugo'
import { cancelFollowupsOnReply } from '@/server/followup/jobs/scheduler'
import type { MessageData, ConversationData } from '@/lib/centrifugo'

type UazapiMessagePayload = {
  BaseUrl?: string
  EventType?: string
  instanceName?: string
  owner?: string
  token?: string
  chat?: {
    id?: string
    name?: string
    phone?: string
    wa_chatid?: string
    wa_contactName?: string
    wa_fastid?: string
    wa_lastMessageSender?: string
    wa_lastMessageType?: string
    wa_lastMsgTimestamp?: number
  }
  message?: {
    chatid?: string
    content?: unknown
    fromMe?: boolean
    id?: string
    mediaType?: string
    messageTimestamp?: number
    messageType?: string
    messageid?: string
    owner?: string
    sender?: string
    senderName?: string
    text?: string
    type?: string
    wasSentByApi?: boolean
  }
}


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const webhook = await prisma.instanceWebhook.findUnique({
      where: { id },
    })

    if (!webhook) {
      console.warn('[webhook] webhook não encontrado', { id })
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    const incoming = await request.json().catch(() => ({}))
    const body: UazapiMessagePayload =
      Array.isArray(incoming) && incoming.length > 0 && incoming[0]?.body
        ? incoming[0].body
        : incoming

    if (!body || typeof body !== 'object') {
      console.error('[webhook] payload inválido (vazio ou não-objeto)')
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    const eventType = body.EventType ?? 'unknown'
    if (eventType !== 'messages') {
      console.warn('[webhook] EventType não suportado', { eventType, webhookId: id })
      return NextResponse.json({ ok: true })
    }

    const resolved = normalizePayload(body)
    if (!resolved.remoteJid || !resolved.providerMessageId) {
      console.error('[webhook] campos essenciais ausentes', {
        webhookId: id,
        remoteJid: resolved.remoteJid,
        providerMessageId: resolved.providerMessageId,
      })
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    console.log('[webhook] Evento recebido:', {
      eventType,
      instanceId: resolved.instanceId,
      webhookId: webhook.id,
      timestamp: new Date().toISOString(),
      direction: resolved.direction,
    })

    await persistMessage({
      organizationId: webhook.organizationId,
      instanceId: webhook.instanceId,
      payload: resolved,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[webhook] erro ao processar', error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

function normalizePayload(body: UazapiMessagePayload) {
  const message = body.message ?? {}
  const chat = body.chat ?? {}

  const remoteJid = message.chatid || chat.wa_chatid || null
  const phone = chat.phone ?? derivePhoneFromJid(remoteJid)
  const name = chat.name || chat.wa_contactName || message.senderName || null
  const providerMessageId = message.id || message.messageid || null
  const messageType = message.messageType || message.type || 'unknown'
  const mediaType = message.mediaType || ''
  const direction = message.fromMe ? 'OUTBOUND' : 'INBOUND'
  const sentAt = message.messageTimestamp
    ? new Date(message.messageTimestamp)
    : new Date()

  const contentText =
    typeof message.text === 'string' && message.text.trim().length > 0
      ? message.text
      : typeof message.content === 'string'
        ? message.content
        : typeof (message.content as { text?: string })?.text === 'string'
          ? (message.content as { text: string }).text
          : ''

  const mediaContent =
    typeof message.content === 'object' &&
    message.content !== null &&
    typeof (message.content as { URL?: string }).URL === 'string'
      ? (message.content as { URL: string })
      : null

  return {
    instanceId: message.owner || body.owner || 'unknown',
    remoteJid,
    phone,
    name,
    direction,
    providerMessageId,
    messageType,
    mediaType: mediaType || (message.type === 'media' ? 'media' : 'text'),
    contentText: contentText || '[sem texto]',
    mediaUrl: mediaContent?.URL ?? null,
    mediaMimeType:
      mediaContent && 'mimetype' in mediaContent
        ? (mediaContent as { mimetype?: string }).mimetype ?? null
        : null,
    mediaSizeBytes:
      mediaContent && 'fileLength' in mediaContent
        ? (mediaContent as { fileLength?: number }).fileLength ?? null
        : null,
    mediaDurationSeconds:
      mediaContent && 'seconds' in mediaContent
        ? (mediaContent as { seconds?: number }).seconds ?? null
        : null,
    sentAt,
  }
}

function derivePhoneFromJid(jid: string | null | undefined) {
  if (!jid) return null
  const digits = jid.replace(/\D/g, '')
  if (!digits) return null
  return `+${digits}`
}

async function persistMessage({
  organizationId,
  instanceId,
  payload,
}: {
  organizationId: string
  instanceId: string
  payload: ReturnType<typeof normalizePayload>
}) {
  // 1. Upsert Lead (find or create by phone/remoteJid)
  const lead = await upsertLead({
    organizationId,
    remoteJid: payload.remoteJid!,
    phone: payload.phone ?? '',
    name: payload.name,
  })

  // 2. Upsert Conversation (1:1 with Lead)
  const conversation = await upsertConversation({
    organizationId,
    leadId: lead.id,
    instanceId,
  })

  // 3. Resolve Ticket (find open or create new)
  const ticket = await resolveTicket(conversation.id)

  // 4. Create Message linked to Ticket
  const senderType = payload.direction === 'outbound' ? 'USER' : 'LEAD'
  const message = await createMessage({
    ticketId: ticket.id,
    senderType: senderType as 'LEAD' | 'USER' | 'AI' | 'SYSTEM',
    senderId: senderType === 'LEAD' ? lead.id : null,
    senderName: payload.name,
    messageType: payload.messageType.toUpperCase(),
    content: payload.contentText,
    mediaUrl: payload.mediaUrl,
    mediaType: payload.mediaMimeType,
    fileName: null,
    sentAt: payload.sentAt,
  })

  // 4.1. Cancel follow-ups if lead replied
  if (senderType === 'LEAD') {
    try {
      await cancelFollowupsOnReply(ticket.id)
    } catch (followupError) {
      // Log but don't fail the webhook on follow-up cancellation errors
      console.error('[webhook] Follow-up cancellation error:', followupError)
    }
  }

  // 5. Update Conversation last message
  const updatedConversation = await updateConversationLastMessage(
    conversation.id,
    payload.sentAt
  )

  // 6. Publish to Centrifugo for real-time updates
  try {
    // Publish new message to conversation channel
    const messageData: MessageData = {
      id: message.id,
      ticketId: message.ticketId,
      content: message.content,
      senderType: message.senderType as 'LEAD' | 'USER' | 'AI' | 'SYSTEM',
      sentAt: message.sentAt,
      messageType: message.messageType,
      mediaUrl: message.mediaUrl,
      senderId: message.senderId,
      senderName: message.senderName,
    }
    await publishNewMessage(conversation.id, messageData)

    // Publish conversation update to organization channel
    const conversationData: ConversationData = {
      id: updatedConversation.id,
      leadId: updatedConversation.leadId,
      status: updatedConversation.status as 'OPEN' | 'PENDING' | 'RESOLVED' | 'SNOOZED',
      lastMessageAt: updatedConversation.lastMessageAt,
      unreadCount: updatedConversation.unreadCount,
    }
    await publishConversationUpdate(organizationId, conversationData)
  } catch (centrifugoError) {
    // Log but don't fail the webhook on Centrifugo errors
    console.error('[webhook] Centrifugo publish error:', centrifugoError)
  }

  // Legacy: Also persist to WhatsappMessage for backwards compatibility
  await prisma.whatsappMessage.upsert({
    where: {
      organization_message_unique: {
        organizationId,
        providerMessageId: payload.providerMessageId!,
      },
    },
    update: {
      contentText: payload.contentText,
      mediaUrl: payload.mediaUrl,
      mediaMimeType: payload.mediaMimeType,
      mediaSizeBytes: payload.mediaSizeBytes,
      mediaDurationSeconds: payload.mediaDurationSeconds,
      sentAt: payload.sentAt,
    },
    create: {
      organizationId,
      instanceId: instanceId,
      leadId: lead.id,
      ticketId: ticket.id,
      remoteJid: payload.remoteJid!,
      direction: payload.direction as 'INBOUND' | 'OUTBOUND',
      providerMessageId: payload.providerMessageId!,
      messageType: payload.messageType,
      mediaType: payload.mediaMimeType || '',
      contentText: payload.contentText,
      mediaUrl: payload.mediaUrl,
      mediaMimeType: payload.mediaMimeType,
      mediaSizeBytes: payload.mediaSizeBytes,
      mediaDurationSeconds: payload.mediaDurationSeconds,
      sentAt: payload.sentAt,
    },
  })

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { lastMessageAt: payload.sentAt },
  })
}

