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

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    // Parse request body
    const body = await request.json()
    const validated = cancelRequestSchema.parse(body)

    // Cancel subscription
    const result = await cancelSubscription(auth.organizationId, validated.atPeriodEnd ?? false)

    // Return success response
    const response = cancelResponseSchema.parse({
      status: result.status,
      canceledAtPeriodEnd: result.canceledAtPeriodEnd,
      canceledAt: result.canceledAt?.toISOString() ?? null,
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      )
    }

    logger.error({ err: error }, 'Subscription cancellation error')
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
