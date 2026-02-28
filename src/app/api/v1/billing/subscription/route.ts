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

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    // Fetch active subscription
    const subscription = await getActiveSubscription(auth.organizationId)

    // Validate and return response
    const response = subscriptionResponseSchema.parse({
      id: subscription.id,
      organizationId: subscription.organizationId,
      planType: subscription.planType,
      status: subscription.status,
      billingCycleStartDate: subscription.billingCycleStartDate.toISOString(),
      billingCycleEndDate: subscription.billingCycleEndDate.toISOString(),
      nextResetDate: subscription.nextResetDate.toISOString(),
      eventLimitPerMonth: subscription.eventLimitPerMonth,
      eventsUsedInCurrentCycle: subscription.eventsUsedInCurrentCycle,
      createdAt: subscription.createdAt.toISOString(),
      provider: subscription.provider,
      providerSubscriptionId: subscription.providerSubscriptionId,
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}
