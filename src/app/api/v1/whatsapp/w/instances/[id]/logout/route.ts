import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { logoutWuzapiInstance } from '@/services/whatsapp/wuzapi'

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
    await logoutWuzapiInstance({
      instanceId: id,
      organizationId: access.organizationId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/v1/whatsapp/w/instances/[id]/logout] POST error', error)
    return NextResponse.json({ error: 'Falha ao desconectar instância' }, { status: 500 })
  }
}
