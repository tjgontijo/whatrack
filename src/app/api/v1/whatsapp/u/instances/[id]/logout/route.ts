import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'
import { logoutWhatsappInstance } from '@/services/whatsapp/uazapi/logout-instance'

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
        await logoutWhatsappInstance({
            instanceId: id,
            organizationId: access.organizationId,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[api/v1/whatsapp/instances/[id]/logout] POST error', error)
        return NextResponse.json({ error: 'Falha ao desconectar instância' }, { status: 500 })
    }
}
