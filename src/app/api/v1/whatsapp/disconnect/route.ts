import { NextResponse } from 'next/server'
import { whatsappDisconnectSchema } from '@/features/whatsapp/schemas/whatsapp-schemas'
import { disconnectWhatsAppConfig } from '@/features/whatsapp/services/whatsapp-config.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

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
    logger.error({ err: error }, '[API] Disconnect Error')
    return apiError(message, 500, error)
  }
}
