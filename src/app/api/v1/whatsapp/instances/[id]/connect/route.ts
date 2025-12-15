import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { connectWhatsappInstance } from '@/services/whatsapp/uazapi/connect-instance'
import { connectInstanceSchema } from '@/lib/schema/whatsapp'

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
        // Parse e valida o body (phone é opcional)
        const body = await request.json().catch(() => ({}))
        const parsed = connectInstanceSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({
                error: 'Payload inválido',
                details: parsed.error.flatten()
            }, { status: 400 })
        }

        const result = await connectWhatsappInstance({
            instanceId: id,
            organizationId: access.organizationId,
            phone: parsed.data.phone,  // Opcional: se fornecido, gera pair code
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('[api/v1/whatsapp/instances/[id]/connect] POST error', error)
        const message = error instanceof Error ? error.message : 'Falha desconhecida'
        return NextResponse.json({
            error: 'Falha ao conectar instância',
            details: message
        }, { status: 500 })
    }
}
