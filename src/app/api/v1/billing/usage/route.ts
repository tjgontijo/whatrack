/**
 * GET /api/v1/billing/usage
 *
 * Fetch current event usage for the organization's billing cycle
 * Requires organization access
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { usageResponseSchema } from '@/schemas/billing/billing-schemas'
import { getEventUsageForCycle, NoActiveSubscriptionError } from '@/services/billing/billing-metering.service'
import { logger } from '@/lib/utils/logger'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const usage = await getEventUsageForCycle(auth.organizationId)

    const response = usageResponseSchema.parse({
      used: usage.used,
      limit: usage.limit,
      overage: usage.overage,
      nextResetDate: usage.nextResetDate.toISOString(),
    })

    return apiSuccess(response)
  } catch (error) {
    if (error instanceof NoActiveSubscriptionError) {
      return apiSuccess({ usage: null })
    }

    logger.error({ err: error }, 'Usage fetch error')
    return apiError('Failed to fetch usage', 500, error)
  }
}
