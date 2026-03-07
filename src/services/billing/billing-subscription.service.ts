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
import { Prisma } from '@db/client'
import { BILLING_CYCLE_DAYS, PLAN_LIMITS } from '@/lib/billing/providers/metering-constants'
import type { PlanType, SubscriptionStatus } from '@/types/billing/billing'
import { isSubscriptionStatus } from '@/types/billing/billing'

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

function ensureSubscriptionStatus(status: string): SubscriptionStatus {
  if (!isSubscriptionStatus(status)) {
    throw new Error(`Invalid subscription status: ${status}`)
  }

  return status
}

/**
 * Parameters for creating a subscription
 */
export interface CreateSubscriptionParams {
  organizationId: string
  planType: PlanType
  provider?: string
  providerCustomerId?: string
  providerSubscriptionId?: string
  status?: SubscriptionStatus
}

/**
 * Create a new subscription for an organization
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<void> {
  const { organizationId, planType, provider, providerCustomerId, providerSubscriptionId, status } = params

  // Check if org already has active subscription
  const existing = await prisma.billingSubscription.findUnique({
    where: { organizationId },
  })

  // If already exists, we might want to update it instead of throwing if it's not active
  if (existing && existing.status === 'active') {
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

  const subscriptionData = {
    organizationId,
    provider: provider || 'abacatepay',
    providerCustomerId: providerCustomerId || `cust_${organizationId}`,
    providerSubscriptionId: providerSubscriptionId || `sub_${organizationId}`,
    planType,
    eventLimitPerMonth: planLimits.eventLimitPerMonth,
    overagePricePerEvent: new Prisma.Decimal(planLimits.overagePricePerEvent),
    billingCycleStartDate,
    billingCycleEndDate,
    nextResetDate: billingCycleEndDate,
    status: status || 'active',
  }

  if (existing) {
    // Update existing subscription
    await prisma.billingSubscription.update({
      where: { id: existing.id },
      data: subscriptionData,
    })
  } else {
    // Create new subscription in database
    await prisma.billingSubscription.create({
      data: subscriptionData,
    })
  }
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
      canceledAtPeriodEnd: true,
      billingCycleStartDate: true,
      billingCycleEndDate: true,
      nextResetDate: true,
      eventLimitPerMonth: true,
      eventsUsedInCurrentCycle: true,
      createdAt: true,
      canceledAt: true,
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
  const validatedStatus = ensureSubscriptionStatus(status)

  await prisma.billingSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: validatedStatus,
      ...(validatedStatus === 'canceled' && { canceledAt: new Date() }),
    },
  })
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  organizationId: string,
  atPeriodEnd: boolean = false
): Promise<{
  status: SubscriptionStatus
  canceledAtPeriodEnd: boolean
  canceledAt: Date | null
}> {
  const subscription = await getActiveSubscription(organizationId)

  if (atPeriodEnd) {
    const updatedSubscription = await prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        canceledAtPeriodEnd: true,
      },
      select: {
        status: true,
        canceledAtPeriodEnd: true,
        canceledAt: true,
      },
    })

    return {
      ...updatedSubscription,
      status: ensureSubscriptionStatus(updatedSubscription.status),
    }
  }

  const updatedSubscription = await prisma.billingSubscription.update({
    where: { id: subscription.id },
    data: {
      status: 'canceled',
      canceledAtPeriodEnd: false,
      canceledAt: new Date(),
    },
    select: {
      status: true,
      canceledAtPeriodEnd: true,
      canceledAt: true,
    },
  })

  return {
    ...updatedSubscription,
    status: ensureSubscriptionStatus(updatedSubscription.status),
  }
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
// (Imported at the top)
