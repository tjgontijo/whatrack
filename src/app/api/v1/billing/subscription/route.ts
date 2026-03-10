/**
 * GET /api/v1/billing/subscription
 *
 * Fetch active subscription for the organization
 * Requires organization access
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { subscriptionResponseSchema } from '@/schemas/billing/billing-schemas'
import { getActiveSubscription, SubscriptionNotFoundError } from '@/services/billing/billing-subscription.service'
import { logger } from '@/lib/utils/logger'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const subscription = await getActiveSubscription(auth.organizationId)

    const response = subscriptionResponseSchema.parse({
      id: subscription.id,
      organizationId: subscription.organizationId,
      planType: subscription.planType,
      planName: subscription.plan?.name ?? null,
      status: subscription.status,
      canceledAtPeriodEnd: subscription.canceledAtPeriodEnd,
      billingCycleStartDate: subscription.billingCycleStartDate.toISOString(),
      billingCycleEndDate: subscription.billingCycleEndDate.toISOString(),
      nextResetDate: subscription.nextResetDate.toISOString(),
      trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
      createdAt: subscription.createdAt.toISOString(),
      canceledAt: subscription.canceledAt?.toISOString() ?? null,
      provider: subscription.provider,
      providerSubscriptionId: subscription.providerSubscriptionId ?? null,
      items: subscription.items,
      entitlements: subscription.entitlements,
    })

    return apiSuccess(response)
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return apiSuccess({ subscription: null })
    }

    logger.error({ err: error }, 'Subscription fetch error')
    return apiError('Failed to fetch subscription', 500, error)
  }
}
