import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/v1/whatsapp/instances/[id]/webhook/[id]
 * 
 * Webhook público que recebe eventos do provedor UAZAPI
 * 
 * Fluxo:
 * 1. connectWhatsappInstance() → provisionInstanceWebhook()
 * 2. provisionInstanceWebhook() registra esta URL no provedor
 * 3. Provedor envia POST com eventos (mensagens, conexão, etc)
 * 4. Este handler processa e loga o payload
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: webhookId } = await params
    const body = await request.json()

    // Log do payload recebido (controlado por env)
    if (process.env.WHATSAPP_WEBHOOK_DEBUG === '1') {
      console.log('[whatsapp-webhook] Payload recebido:', {
        webhookId,
        timestamp: new Date().toISOString(),
        payload: JSON.stringify(body, null, 2),
      })
    }

    // Buscar webhook no banco para validar e obter contexto
    const webhook = await prisma.whatsappInstanceWebhook.findUnique({
      where: { id: webhookId },
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
      console.warn('[whatsapp-webhook] Webhook não encontrado:', { webhookId })
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Log estruturado com contexto
    console.log('[whatsapp-webhook] Evento processado', {
      webhookId,
      organizationId: webhook.organizationId,
      instanceId: webhook.instance.instanceId,
      instanceLabel: webhook.instance.label,
      eventType: body.EventType || body.event || 'unknown',
      timestamp: new Date().toISOString(),
    })

    // TODO: Processar diferentes tipos de eventos
    // - EventType === 'messages' → salvar mensagem, atualizar conversa
    // - EventType === 'connection' → atualizar status da instância
    // - etc

    // Por enquanto, apenas confirmar recebimento
    return NextResponse.json(
      { success: true, webhookId },
      { status: 200 }
    )
  } catch (error) {
    console.error('[whatsapp-webhook] Erro ao processar webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}
