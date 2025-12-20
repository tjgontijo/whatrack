import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { upsertLead, upsertConversation, resolveTicket, createMessage } from '@/services/chat'

/**
 * POST /api/v1/whatsapp/instances/[id]/webhook/[webhookId]
 * Webhook público (UAZAPI) para eventos de uma instância específica.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) {
  try {
    const { webhookId, id: instanceId } = await params
    const body = await request.json()

    if (process.env.WHATSAPP_WEBHOOK_DEBUG === '1') {
      console.log('[whatsapp-webhook] Payload recebido:', {
        webhookId,
        instanceId,
        timestamp: new Date().toISOString(),
        payload: JSON.stringify(body, null, 2),
      })
    }

    const webhook = await prisma.whatsappInstanceWebhook.findFirst({
      where: { id: webhookId, instanceId },
      include: {
        instance: {
          select: {
            organizationId: true,
            instanceId: true,
            label: true,
          },
        },
      },
    })

    if (!webhook) {
      console.warn('[whatsapp-webhook] Webhook não encontrado:', { webhookId, instanceId })
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const eventType = body.EventType || body.event || 'unknown'
    console.log('[whatsapp-webhook] Evento recebido', {
      webhookId,
      instanceId,
      organizationId: webhook.organizationId,
      instanceLabel: webhook.instance.label,
      eventType,
      timestamp: new Date().toISOString(),
    })

    switch (eventType) {
      case 'messages': {
        const message = body.message
        const chat = body.chat

        if (!message || message.fromMe) {
          console.log('[whatsapp-webhook] Ignorando mensagem do bot ou sem conteúdo')
          break
        }

        try {
          const senderPhone = message.sender?.replace('@s.whatsapp.net', '')?.replace('@g.us', '') || ''
          const contactName = chat?.name || message.senderName || 'Contato'

          console.log('[whatsapp-webhook] Processando mensagem:', {
            from: senderPhone,
            content: message.text || message.content,
            type: message.type,
            name: contactName,
          })

          // 1. Upsert lead
          const lead = await upsertLead({
            organizationId: webhook.instance.organizationId,
            remoteJid: message.sender || '',
            phone: senderPhone,
            name: contactName,
          })

          // 2. Upsert conversation
          const conversation = await upsertConversation({
            organizationId: webhook.instance.organizationId,
            leadId: lead.id,
            instanceId: webhook.instance.instanceId,
          })

          // 3. Resolve ticket
          const ticket = await resolveTicket(conversation.id)

          // 4. Create message
          await createMessage({
            ticketId: ticket.id,
            senderType: 'LEAD',
            senderId: message.sender || null,
            senderName: contactName,
            messageType: message.type || 'TEXT',
            content: message.text || message.content || '',
            mediaUrl: null,
            mediaType: null,
            fileName: null,
            sentAt: new Date(message.messageTimestamp || Date.now()),
          })

          console.log('[whatsapp-webhook] Mensagem salva com sucesso:', {
            leadId: lead.id,
            conversationId: conversation.id,
            ticketId: ticket.id,
          })
        } catch (err) {
          console.error('[whatsapp-webhook] Erro ao processar mensagem:', err)
        }
        break
      }
      case 'connection':
      case 'connected': {
        console.log('[whatsapp-webhook] Status de conexão:', body.status || body.jid)
        break
      }
      case 'logout':
      case 'disconnected': {
        console.log('[whatsapp-webhook] Instância desconectou')
        break
      }
      default: {
        console.log('[whatsapp-webhook] Evento desconhecido:', eventType)
      }
    }

    return NextResponse.json({ success: true, webhookId }, { status: 200 })
  } catch (error) {
    console.error('[whatsapp-webhook] Erro ao processar webhook:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
