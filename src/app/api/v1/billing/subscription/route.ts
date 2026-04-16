/**
 * GET /api/v1/billing/subscription
 *
 * Fetch active subscription for the organization
 * Requires organization access
 */

import { NextRequest } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

export async function GET(request: NextRequest) {
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const subscription = await prisma.billingSubscription.findUnique({
      where: { organizationId: auth.organizationId },
      include: {
        offer: {
          include: { plan: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!subscription) {
      return apiSuccess({ subscription: null })
    }

    return apiSuccess({
      subscription: {
        id: subscription.id,
        organizationId: subscription.organizationId,
        status: subscription.status,
        isActive: subscription.isActive,
        paymentMethod: subscription.paymentMethod,
        offerCode: subscription.offer?.code ?? null,
        planCode: subscription.offer?.plan.code ?? null,
        asaasId: subscription.asaasId,
        asaasCustomerId: subscription.asaasCustomerId,
        purchaseDate: subscription.purchaseDate?.toISOString() ?? null,
        expiresAt: subscription.expiresAt?.toISOString() ?? null,
        canceledAt: subscription.canceledAt?.toISOString() ?? null,
        failureReason: subscription.failureReason,
        failureCount: subscription.failureCount,
        lastFailureAt: subscription.lastFailureAt?.toISOString() ?? null,
        nextRetryAt: subscription.nextRetryAt?.toISOString() ?? null,
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString(),
        lastInvoice: subscription.invoices[0]
          ? {
              id: subscription.invoices[0].id,
              asaasId: subscription.invoices[0].asaasId,
              status: subscription.invoices[0].status,
              paymentMethod: subscription.invoices[0].paymentMethod,
              value: subscription.invoices[0].value,
              dueDate: subscription.invoices[0].dueDate.toISOString(),
              paidAt: subscription.invoices[0].paidAt?.toISOString() ?? null,
              pixQrCodePayload: subscription.invoices[0].pixQrCodePayload ?? null,
              pixQrCodeImage: subscription.invoices[0].pixQrCodeImage ?? null,
              pixExpirationDate: subscription.invoices[0].pixExpirationDate?.toISOString() ?? null,
            }
          : null,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Subscription fetch error')
    return apiError('Failed to fetch subscription', 500, error)
  }
}
