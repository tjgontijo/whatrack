import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/v1/whatsapp/instances/[instanceId]/webhook/[webhookId]
 * Webhook público (UAZAPI) para eventos de uma instância específica.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string; webhookId: string }> }
) {
  try {
    const { webhookId, instanceId } = await params
    const body = await request.json()

    // Log do payload bruto (controlado por env)
    if (process.env.WHATSAPP_WEBHOOK_DEBUG === '1') {
      console.log('[whatsapp-webhook] Payload recebido:', {
        webhookId,
        instanceId,
        timestamp: new Date().toISOString(),
        payload: JSON.stringify(body, null, 2),
      })
    }

    // Buscar webhook no banco para validar e obter contexto
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
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Log estruturado com contexto
    const eventType = body.EventType || body.event || 'unknown'
    console.log('[whatsapp-webhook] Evento recebido', {
      webhookId,
      instanceId,
      organizationId: webhook.organizationId,
      instanceLabel: webhook.instance.label,
      eventType,
      timestamp: new Date().toISOString(),
    })

    // TODO: Processar por tipo de evento
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
