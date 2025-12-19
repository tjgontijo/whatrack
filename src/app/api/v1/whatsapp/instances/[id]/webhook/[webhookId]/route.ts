import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        console.log('[whatsapp-webhook] Mensagem recebida:', {
          from: body.message?.sender,
          content: body.message?.text || body.message?.content,
          type: body.message?.type,
        })
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
