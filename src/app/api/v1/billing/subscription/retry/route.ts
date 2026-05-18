/**
 * POST /api/v1/billing/subscription/retry
 *
 * Manually trigger a retry of a failed subscription payment
 * Requires organization access
 */

import type { NextRequest } from 'next/server'
import { retrySubscriptionService } from '@/features/billing/services/retry-subscription.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function POST(request: NextRequest) {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const body = await request.json()
    const result = await retrySubscriptionService(auth.organizationId, auth.userId, body)
    return apiSuccess(result)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError('Invalid request body', 400)
    }
    if (error instanceof Error && 'status' in error) {
      return apiError(error.message, error.status as number)
    }
    logger.error({ err: error }, 'Subscription retry error')
    return apiError('Failed to retry subscription', 500, error)
  }
}
