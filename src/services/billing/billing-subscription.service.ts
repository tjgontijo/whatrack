/**
 * Billing Subscription Service
 *
 * Handles subscription lifecycle:
 * - Creating subscriptions
 * - Fetching active subscriptions
 * - Updating status (via webhooks)
 * - Canceling subscriptions
 */

import { prisma } from '@/lib/db/prisma'
import { BILLING_CYCLE_DAYS, PLAN_LIMITS } from '@/lib/payments/metering-constants'
import { ensurePaymentProviders, providerRegistry } from '@/lib/payments/init'
import type { PlanType } from '@/types/billing/billing'

/**
 * Custom domain errors
 */
export class SubscriptionNotFoundError extends Error {
  constructor(organizationId: string) {
    super(`Subscription not found for organization ${organizationId}`)
    this.name = 'SubscriptionNotFoundError'
  }
}

export class SubscriptionAlreadyExistsError extends Error {
  constructor(organizationId: string) {
    super(`Organization ${organizationId} already has an active subscription`)
    this.name = 'SubscriptionAlreadyExistsError'
  }
}

/**
 * Parameters for creating a subscription
 */
export interface CreateSubscriptionParams {
  organizationId: string
  planType: PlanType
}

/**
 * Create a new subscription for an organization
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<void> {
  const { organizationId, planType } = params

  // Check if org already has active subscription
  const existing = await prisma.billingSubscription.findUnique({
    where: { organizationId },
  })

  if (existing) {
    throw new SubscriptionAlreadyExistsError(organizationId)
  }

  // Get plan limits
  const planLimits = PLAN_LIMITS[planType]

  // Calculate billing cycle dates
  const now = new Date()
  const billingCycleStartDate = now
  const billingCycleEndDate = new Date(
    now.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000
  )

  // Create subscription in database
  await prisma.billingSubscription.create({
    data: {
      organizationId,
      provider: 'abacatepay',
      providerCustomerId: `cust_${organizationId}`, // Placeholder
      providerSubscriptionId: `sub_${organizationId}`, // Placeholder
      planType,
      eventLimitPerMonth: planLimits.eventLimitPerMonth,
      overagePricePerEvent: new Prisma.Decimal(planLimits.overagePricePerEvent),
      billingCycleStartDate,
      billingCycleEndDate,
      nextResetDate: billingCycleEndDate,
      status: 'active',
    },
  })
}

/**
 * Get active subscription for an organization
 */
export async function getActiveSubscription(organizationId: string) {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      organizationId: true,
      planType: true,
      status: true,
      billingCycleStartDate: true,
      billingCycleEndDate: true,
      nextResetDate: true,
      eventLimitPerMonth: true,
      eventsUsedInCurrentCycle: true,
      createdAt: true,
      provider: true,
      providerSubscriptionId: true,
    },
  })

  if (!subscription) {
    throw new SubscriptionNotFoundError(organizationId)
  }

  return subscription
}

/**
 * Update subscription status (used by webhook handlers)
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string
): Promise<void> {
  const validStatuses = ['active', 'paused', 'canceled', 'past_due']

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid subscription status: ${status}`)
  }

  await prisma.billingSubscription.update({
    where: { id: subscriptionId },
    data: {
      status,
      ...(status === 'canceled' && { canceledAt: new Date() }),
    },
  })
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  organizationId: string,
  atPeriodEnd: boolean = false
): Promise<void> {
  const subscription = await getActiveSubscription(organizationId)

  // For now, immediately mark as canceled
  // In the future: call provider API based on atPeriodEnd
  await updateSubscriptionStatus(subscription.id, 'canceled')
}

/**
 * Reset billing cycle for a subscription
 * Called by scheduler when billing period ends
 */
export async function resetBillingCycle(
  subscriptionId: string
): Promise<void> {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`)
  }

  // Calculate next cycle
  const nextCycleStart = subscription.nextResetDate
  const nextCycleEnd = new Date(
    nextCycleStart.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000
  )

  await prisma.billingSubscription.update({
    where: { id: subscriptionId },
    data: {
      eventsUsedInCurrentCycle: 0,
      billingCycleStartDate: nextCycleStart,
      billingCycleEndDate: nextCycleEnd,
      nextResetDate: nextCycleEnd,
    },
  })
}

// Re-export Prisma for type safety
import { Prisma } from '@db/client'
