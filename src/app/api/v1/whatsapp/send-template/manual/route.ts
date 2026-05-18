import { timingSafeEqual } from 'node:crypto'
import { whatsappManualSendTemplateSchema } from '@/features/whatsapp/schemas/whatsapp-schemas'
import { sendManualTemplate } from '@/features/whatsapp/services/whatsapp-manual-send.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

function hasValidBearerToken(authorizationHeader: string | null): boolean {
  const expectedToken = process.env.WHATSAPP_MANUAL_SEND_BEARER_TOKEN
  if (!expectedToken) {
    return false
  }

  const [scheme, providedToken] = authorizationHeader?.split(' ') ?? []
  if (scheme !== 'Bearer' || !providedToken) {
    return false
  }

  const expectedBuffer = Buffer.from(expectedToken)
  const providedBuffer = Buffer.from(providedToken)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export async function POST(request: Request) {
  try {
    if (!process.env.WHATSAPP_MANUAL_SEND_BEARER_TOKEN) {
      return apiError('WHATSAPP_MANUAL_SEND_BEARER_TOKEN not configured', 500)
    }

    if (!hasValidBearerToken(request.headers.get('authorization'))) {
      return apiError('Unauthorized', 401)
    }

    const parsed = whatsappManualSendTemplateSchema.safeParse(
      await request.json().catch(() => null)
    )
    if (!parsed.success) {
      return apiError('Payload inválido', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const result = await sendManualTemplate(parsed.data)
    if (!result.success) {
      return apiError(result.error, result.status)
    }

    return apiSuccess({ success: true, ...result.data })
  } catch (error) {
    logger.error({ err: error }, '[WhatsApp Manual Send] Error')
    return apiError('Failed to send WhatsApp message', 500, error)
  }
}
