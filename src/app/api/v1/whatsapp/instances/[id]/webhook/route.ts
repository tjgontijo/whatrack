import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { updateWebhook } from '@/services/whatsapp/uazapi/update-webhook'
import { updateWebhookSchema } from '@/lib/schema/whatsapp'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
        return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params

    try {
        const body = await request.json()
        const parsed = updateWebhookSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Payload inválido', details: parsed.error.flatten() }, { status: 400 })
        }

        await updateWebhook({
            instanceId: id,
            organizationId: access.organizationId,
            action: parsed.data.action,
            id: parsed.data.id,
            enabled: parsed.data.enabled,
            events: parsed.data.events,
            excludeMessages: parsed.data.excludeMessages,
            addUrlEvents: parsed.data.addUrlEvents,
            addUrlTypesMessages: parsed.data.addUrlTypesMessages,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[api/v1/whatsapp/instances/[id]/webhook] POST error', error)
        return NextResponse.json({ error: 'Falha ao configurar webhook' }, { status: 500 })
    }
}
