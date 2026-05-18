/**
 * GET /api/v1/billing/subscription
 *
 * Fetch active subscription for the organization
 * Requires organization access
 */

import type { NextRequest } from 'next/server'
import { findSubscriptionWithDetails } from '@/features/billing/repositories/find-subscription-with-details.repository'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(request: NextRequest) {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const subscription = await findSubscriptionWithDetails(auth.organizationId)
    return apiSuccess({ subscription })
  } catch (error) {
    logger.error({ err: error }, 'Subscription fetch error')
    return apiError('Failed to fetch subscription', 500, error)
  }
}
