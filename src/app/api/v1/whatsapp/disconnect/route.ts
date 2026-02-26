import { NextResponse } from 'next/server'

import { whatsappDisconnectSchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { disconnectWhatsAppConfig } from '@/services/whatsapp/whatsapp-config.service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = whatsappDisconnectSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await disconnectWhatsAppConfig({
      organizationId: access.organizationId,
      userId: access.userId,
      configId: parsed.data.configId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect'
    console.error('[API] Disconnect Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
