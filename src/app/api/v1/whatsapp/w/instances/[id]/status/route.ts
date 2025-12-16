import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { getWuzapiInstanceStatus } from '@/services/whatsapp/wuzapi'

/**
 * GET /api/v1/whatsapp/w/instances/:id/status
 * Obtém o status atual da instância WuzAPI em tempo real
 */
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
    const status = await getWuzapiInstanceStatus({
      instanceId: id,
      organizationId: access.organizationId,
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('[api/v1/whatsapp/w/instances/[id]/status] GET error', error)
    const message = error instanceof Error ? error.message : 'Falha desconhecida'
    return NextResponse.json({
      error: 'Falha ao obter status',
      details: message,
    }, { status: 500 })
  }
}
