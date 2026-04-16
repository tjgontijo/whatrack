import { NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/db/prisma'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError('Unauthorized', 403)
  }

  try {
    const subscription = await prisma.billingSubscription.findUnique({
      where: { organizationId: auth.organizationId },
      select: {
        id: true,
        status: true,
        isActive: true,
        failureReason: true,
        failureCount: true,
        lastFailureAt: true,
        lastFailureMessage: true,
        nextRetryAt: true,
        expiresAt: true,
        paymentMethod: true,
      },
    })

    return apiSuccess({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        isActive: subscription.isActive,
        failureReason: subscription.failureReason,
        failureCount: subscription.failureCount,
        lastFailureAt: subscription.lastFailureAt,
        lastFailureMessage: subscription.lastFailureMessage,
        nextRetryAt: subscription.nextRetryAt,
        expiresAt: subscription.expiresAt,
        paymentMethod: subscription.paymentMethod,
      } : null,
    })
  } catch (error) {
    return apiError('Failed to fetch subscription status', 500, error)
  }
}
