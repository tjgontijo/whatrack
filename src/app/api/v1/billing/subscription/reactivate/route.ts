import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { BillingService } from '@/services/billing'

/**
 * POST /api/v1/billing/subscription/reactivate
 *
 * Reactivate a canceled subscription (if still within period).
 * Only works if subscription was canceled at period end, not immediately.
 */
export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    const billingService = new BillingService()

    // Get active subscription (includes canceled ones pending at period end)
    const subscription = await billingService.getActiveSubscription(
      access.organizationId
    )

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Check if subscription is in a state that can be reactivated
    if (subscription.status !== 'canceled' || !subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: 'Subscription cannot be reactivated' },
        { status: 400 }
      )
    }

    const reactivated = await billingService.reactivateSubscription(subscription.id)

    return NextResponse.json(reactivated)
  } catch (error) {
    console.error('[api/billing/subscription/reactivate] POST error', error)

    // Check for specific error messages
    if (error instanceof Error) {
      if (error.message === 'Subscription period has ended, please create a new subscription') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    )
  }
}
