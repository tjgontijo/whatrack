import { NextResponse } from 'next/server'
import { checkWhatsAppTokenHealth } from '@/features/whatsapp/services/whatsapp-config.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const result = await checkWhatsAppTokenHealth(access.organizationId)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check token health'
    logger.error({ err: error }, '[API] Token Health Error')
    return apiError(message, 500, error)
  }
}
