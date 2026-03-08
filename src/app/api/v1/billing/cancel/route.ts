/**
 * POST /api/v1/billing/cancel
 *
 * Cancel active subscription for the organization
 * Requires organization access
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { cancelRequestSchema, cancelResponseSchema } from '@/schemas/billing/billing-schemas'
import { cancelSubscription, SubscriptionNotFoundError } from '@/services/billing/billing-subscription.service'
import { logger } from '@/lib/utils/logger'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const body = await request.json()
    const parsed = cancelRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Invalid request parameters', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const result = await cancelSubscription(auth.organizationId, parsed.data.atPeriodEnd ?? false)

    const response = cancelResponseSchema.parse({
      status: result.status,
      canceledAtPeriodEnd: result.canceledAtPeriodEnd,
      canceledAt: result.canceledAt?.toISOString() ?? null,
    })

    return apiSuccess(response)
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return apiError('No active subscription found', 404)
    }

    if (error instanceof SyntaxError) {
      return apiError('Invalid request body', 400)
    }

    logger.error({ err: error }, 'Subscription cancellation error')
    return apiError('Failed to cancel subscription', 500, error)
  }
}
