import "server-only"
import { z } from 'zod'
import { BillingAuditService } from './audit.service'
import { prisma } from '@/lib/db/prisma'

const retrySubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'subscriptionId is required'),
})

export async function retrySubscriptionService(
  organizationId: string,
  userId: string | undefined,
  input: unknown
) {
  const { subscriptionId } = retrySubscriptionSchema.parse(input)

  const subscription = await prisma.billingSubscription.findFirst({
    where: { id: subscriptionId, organizationId },
    select: { id: true, status: true, failureReason: true, failureCount: true },
  })

  if (!subscription) {
    throw Object.assign(new Error('Subscription not found'), { status: 404 })
  }

  if (subscription.status !== 'FAILED') {
    throw Object.assign(new Error('Only failed subscriptions can be retried'), { status: 400 })
  }

  const updated = await prisma.billingSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'PENDING',
      failureReason: null,
      lastFailureAt: null,
      nextRetryAt: null,
      lastRetryAt: new Date(),
    },
    select: { id: true, status: true },
  })

  await BillingAuditService.log({
    organizationId,
    userId,
    action: 'SUBSCRIPTION_RETRY_INITIATED',
    entity: 'BillingSubscription',
    entityId: subscriptionId,
    metadata: { previousFailureReason: subscription.failureReason },
  })

  return { subscription: updated }
}
