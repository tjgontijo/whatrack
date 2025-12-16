import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { sendWuzapiMessage } from '@/services/whatsapp/wuzapi'
import { sendMessageSchema } from '@/schemas/whatsapp'

/**
 * POST /api/v1/whatsapp/w/messages
 * Envia mensagem através de uma instância WuzAPI
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

    const result = await sendWuzapiMessage({
      instanceId: parsed.data.instanceId,
      organizationId: access.organizationId,
      phone: parsed.data.to,
      message: parsed.data.text ?? '',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/v1/whatsapp/w/messages] POST error', error)
    const message = error instanceof Error ? error.message : 'Falha desconhecida'
    return NextResponse.json({
      error: 'Falha ao enviar mensagem',
      details: message,
    }, { status: 500 })
  }
}
