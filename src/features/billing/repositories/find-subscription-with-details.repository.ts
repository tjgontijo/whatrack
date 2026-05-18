import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findSubscriptionWithDetails(organizationId: string) {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      isActive: true,
      paymentMethod: true,
      asaasId: true,
      asaasCustomerId: true,
      purchaseDate: true,
      expiresAt: true,
      canceledAt: true,
      failureReason: true,
      failureCount: true,
      lastFailureAt: true,
      nextRetryAt: true,
      createdAt: true,
      updatedAt: true,
      offer: {
        select: {
          code: true,
          plan: { select: { code: true } },
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          asaasId: true,
          status: true,
          paymentMethod: true,
          value: true,
          dueDate: true,
          paidAt: true,
          pixQrCodePayload: true,
          pixQrCodeImage: true,
          pixExpirationDate: true,
        },
      },
    },
  })

  if (!subscription) return null

  return {
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
  }
}
