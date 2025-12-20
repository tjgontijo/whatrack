import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { createWhatsappInstance } from '@/services/whatsapp/uazapi/create-instance'
import { listWhatsappInstances } from '@/services/whatsapp/uazapi/list-instances'
import {
    createInstanceSchema,
    whatsappInstanceSchema,
    whatsappInstancesResponseSchema,
} from '@/schemas/whatsapp'

/**
 * GET /api/v1/whatsapp/instances
 * Lista todas as instâncias da organização
 */
export async function GET(request: Request) {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
        return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }

    try {
        const items = await listWhatsappInstances(access.organizationId)
        const payload = whatsappInstancesResponseSchema.parse({ items })
        return NextResponse.json(payload)
    } catch (error) {
        console.error('[api/v1/whatsapp/instances] GET error', error)
        return NextResponse.json({ error: 'Falha ao carregar instâncias' }, { status: 500 })
    }
}

/**
 * POST /api/v1/whatsapp/instances
 * Cria uma nova instância WhatsApp
 */
export async function POST(request: Request) {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
        return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }

    try {
        const body = await request.json()
        const parsed = createInstanceSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({
                error: 'Payload inválido',
                details: parsed.error.flatten()
            }, { status: 400 })
        }

        const record = await createWhatsappInstance({
            organizationId: access.organizationId,
            name: parsed.data.name,
        })

        const payload = whatsappInstanceSchema.parse(record)
        return NextResponse.json(payload, { status: 201 })
    } catch (error) {
        console.error('[api/v1/whatsapp/instances] POST error', error)
        const message = error instanceof Error ? error.message : 'Falha desconhecida'
        return NextResponse.json({
            error: 'Falha ao criar instância',
            details: message
        }, { status: 500 })
    }
}
