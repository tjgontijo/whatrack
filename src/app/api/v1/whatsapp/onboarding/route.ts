import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createWhatsAppOnboardingSession } from '@/services/whatsapp/whatsapp-onboarding.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/whatsapp/onboarding')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const access = await validatePermissionAccess(request, 'manage:whatsapp')
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const result = await createWhatsAppOnboardingSession(
      access.organizationId,
      request.nextUrl.origin
    )

    if ('error' in result) {
      logger.error({ err: result.error }, '[Onboarding] Missing configuration')
      return apiError('Server configuration error', 500, result.error)
    }

    return apiSuccess(result)
  } catch (error) {
    logger.error({ err: error }, '[Onboarding] Error generating URL')
    return apiError('Internal server error', 500, error)
  }
}
