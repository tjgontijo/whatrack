import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { getWuzapiInstanceStatus, deleteWuzapiInstance } from '@/services/whatsapp/wuzapi'
import { whatsappInstanceSchema } from '@/schemas/whatsapp'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params

  try {
    const instance = await getWuzapiInstanceStatus({
      instanceId: id,
      organizationId: access.organizationId,
    })

    if (!instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    const payload = whatsappInstanceSchema.parse(instance)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/v1/whatsapp/w/instances/[id]] GET error', error)
    return NextResponse.json({ error: 'Falha ao buscar instância' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params

  try {
    await deleteWuzapiInstance({
      instanceId: id,
      organizationId: access.organizationId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/v1/whatsapp/w/instances/[id]] DELETE error', error)
    return NextResponse.json({ error: 'Falha ao deletar instância' }, { status: 500 })
  }
}
