/**
 * POST /api/v1/billing/subscription/retry
 *
 * Manually trigger a retry of a failed subscription payment
 * Requires organization access
 */

import { NextRequest } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { BillingAuditService } from '@/services/billing/audit.service'

export async function POST(request: NextRequest) {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const body = await request.json()
    const { subscriptionId } = body

    if (!subscriptionId) {
      return apiError('subscriptionId is required', 400)
    }

    // Verify subscription belongs to org
    const subscription = await prisma.billingSubscription.findFirst({
      where: {
        id: subscriptionId,
        organizationId: auth.organizationId,
      },
      select: {
        id: true,
        status: true,
        failureReason: true,
        failureCount: true,
      },
    })

    if (!subscription) {
      return apiError('Subscription not found', 404)
    }

    if (subscription.status !== 'FAILED') {
      return apiError('Only failed subscriptions can be retried', 400)
    }

    // Reset failure tracking for a new retry
    const updatedSubscription = await prisma.billingSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'PENDING',
        failureReason: null,
        // Keep failureCount for history but clear retry tracking
        lastFailureAt: null,
        nextRetryAt: null,
        lastRetryAt: new Date(),
      },
    })

    await BillingAuditService.log({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: 'SUBSCRIPTION_RETRY_INITIATED',
      entity: 'BillingSubscription',
      entityId: subscriptionId,
      metadata: { previousFailureReason: subscription.failureReason },
    })

    return apiSuccess({
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Subscription retry error')
    return apiError('Failed to retry subscription', 500, error)
  }
}
