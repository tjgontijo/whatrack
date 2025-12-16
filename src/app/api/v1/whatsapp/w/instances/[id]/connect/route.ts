import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { connectWuzapiInstance } from '@/services/whatsapp/wuzapi'

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
    const result = await connectWuzapiInstance({
      instanceId: id,
      organizationId: access.organizationId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/v1/whatsapp/w/instances/[id]/connect] POST error', error)
    const message = error instanceof Error ? error.message : 'Falha desconhecida'
    return NextResponse.json({
      error: 'Falha ao conectar instância',
      details: message
    }, { status: 500 })
  }
}
