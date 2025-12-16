import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { BillingService } from '@/services/billing'
import { checkoutSchema } from '../schemas'

/**
 * POST /api/v1/billing/checkout
 *
 * Create a new subscription for the organization.
 * Requires: planId, interval, billingType
 * Optional: cardToken (required for credit_card)
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

    const json = await request.json()
    const parsed = checkoutSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { planId, interval, billingType, cardToken } = parsed.data

    // Validate cardToken is present for credit_card
    if (billingType === 'credit_card' && !cardToken) {
      return NextResponse.json(
        { error: 'Card token is required for credit card payments' },
        { status: 400 }
      )
    }

    const billingService = new BillingService()
    const subscription = await billingService.createSubscription({
      organizationId: access.organizationId,
      planId,
      interval,
      billingType,
      cardToken,
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('[api/billing/checkout] POST error', error)

    if (error instanceof Error) {
      // Handle known errors
      if (error.message.includes('Plan not found')) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }
      if (error.message.includes('Price not found')) {
        return NextResponse.json(
          { error: 'Price not available for this plan/interval' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
