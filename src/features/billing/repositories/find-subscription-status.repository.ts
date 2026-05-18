import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findSubscriptionStatus(organizationId: string) {
  return prisma.billingSubscription.findUnique({
    where: { organizationId },
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
}
