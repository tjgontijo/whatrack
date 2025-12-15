import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { sendWhatsappMessage } from '@/services/whatsapp/uazapi/send-whatsapp-message'
import { sendMessageSchema } from '@/lib/schema/whatsapp'

/**
 * POST /api/v1/whatsapp/messages
 * Envia mensagem através de uma instância WhatsApp
 */
export async function POST(request: Request) {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
        return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }

    try {
        const body = await request.json()
        const parsed = sendMessageSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({
                error: 'Payload inválido',
                details: parsed.error.flatten(),
            }, { status: 400 })
        }

        const result = await sendWhatsappMessage({
            instanceId: parsed.data.instanceId,
            organizationId: access.organizationId,
            to: parsed.data.to,
            type: parsed.data.type,
            text: parsed.data.text,
            mediaUrl: parsed.data.mediaUrl,
            caption: parsed.data.caption,
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('[api/v1/whatsapp/messages] POST error', error)
        const message = error instanceof Error ? error.message : 'Falha desconhecida'
        return NextResponse.json({
            error: 'Falha ao enviar mensagem',
            details: message,
        }, { status: 500 })
    }
}
