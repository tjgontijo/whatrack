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
    // Fetch usage for current cycle
    const usage = await getEventUsageForCycle(auth.organizationId)

    // Validate and return response
    const response = usageResponseSchema.parse({
      used: usage.used,
      limit: usage.limit,
      overage: usage.overage,
      nextResetDate: usage.nextResetDate.toISOString(),
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof NoActiveSubscriptionError) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    console.error('Usage fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
