import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { LimitService } from '@/services/billing'

/**
 * GET /api/v1/billing/usage
 *
 * Get usage statistics for the organization.
 * Returns current resource usage vs plan limits.
 */
export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    const limitService = new LimitService()
    const [usage, limits] = await Promise.all([
      limitService.getUsageStats(access.organizationId),
      limitService.getOrganizationLimits(access.organizationId),
    ])

    return NextResponse.json({
      usage,
      limits,
    })
  } catch (error) {
    console.error('[api/billing/usage] GET error', error)
    return NextResponse.json(
      { error: 'Failed to get usage statistics' },
      { status: 500 }
    )
  }
}
