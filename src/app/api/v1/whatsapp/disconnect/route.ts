import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { whatsappDisconnectSchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { disconnectWhatsAppConfig } from '@/services/whatsapp/whatsapp-config.service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const parsed = whatsappDisconnectSchema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await disconnectWhatsAppConfig({
      organizationId: access.organizationId,
      userId: access.userId,
      configId: parsed.data.configId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect'
    console.error('[API] Disconnect Error:', error)
    return apiError(message, 500, error)
  }
}
