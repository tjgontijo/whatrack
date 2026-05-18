import type { NextRequest } from 'next/server'
import { findSubscriptionStatus } from '@/features/billing/repositories/find-subscription-status.repository'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(request: NextRequest) {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError('Unauthorized', 403)
  }

  try {
    const subscription = await findSubscriptionStatus(auth.organizationId)
    return apiSuccess({ subscription })
  } catch (error) {
    return apiError('Failed to fetch subscription status', 500, error)
  }
}
