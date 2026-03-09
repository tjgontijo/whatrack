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
import type { SubscriptionStatus } from '@/types/billing/billing'
import { isSubscriptionStatus } from '@/types/billing/billing'
import { getBillingPlanBySlug } from './billing-plan-catalog.service'

const BILLING_CYCLE_DAYS = 30

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
  planType: string
  provider?: string
  providerCustomerId?: string
  providerSubscriptionId?: string
  status?: SubscriptionStatus
  billingCycleStartDate?: Date
  billingCycleEndDate?: Date
  nextResetDate?: Date
  trialEndsAt?: Date | null
  canceledAtPeriodEnd?: boolean
}

/**
 * Create a new subscription for an organization
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<void> {
  const {
    organizationId,
    planType,
    provider,
    providerCustomerId,
    providerSubscriptionId,
    status,
    billingCycleStartDate,
    billingCycleEndDate,
    nextResetDate,
    trialEndsAt,
    canceledAtPeriodEnd,
  } = params

  // Check if org already has active subscription
  const existing = await prisma.billingSubscription.findUnique({
    where: { organizationId },
  })

  // If already exists, we might want to update it instead of throwing if it's not active
  if (existing && existing.status === 'active') {
    throw new SubscriptionAlreadyExistsError(organizationId)
  }

  // Get plan limits
  const plan = await getBillingPlanBySlug(planType)

  if (!plan) {
    throw new Error(`Billing plan not found for slug: ${planType}`)
  }

  // Calculate billing cycle dates
  const cycleStartDate = billingCycleStartDate ?? new Date()
  const cycleEndDate = billingCycleEndDate ?? new Date(
    cycleStartDate.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000
  )

  const subscriptionData = {
    organizationId,
    provider: provider || 'stripe',
    providerCustomerId: providerCustomerId || `cust_${organizationId}`,
    providerSubscriptionId: providerSubscriptionId || `sub_${organizationId}`,
    planType,
    planId: plan.id,
    eventLimitPerMonth: plan.eventLimitPerMonth,
    overagePricePerEvent: new Prisma.Decimal(plan.overagePricePerEvent.toString()),
    billingCycleStartDate: cycleStartDate,
    billingCycleEndDate: cycleEndDate,
    nextResetDate: nextResetDate ?? cycleEndDate,
    trialEndsAt: trialEndsAt ?? null,
    status: status || 'active',
    canceledAtPeriodEnd: canceledAtPeriodEnd ?? false,
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
      trialEndsAt: true,
      eventLimitPerMonth: true,
      eventsUsedInCurrentCycle: true,
      createdAt: true,
      canceledAt: true,
      provider: true,
      providerSubscriptionId: true,
      plan: {
        select: {
          name: true,
        },
      },
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
  const subscriptionId = subscription.providerSubscriptionId

  if (!subscriptionId) {
    throw new Error('Subscription is missing provider subscription ID')
  }

  const { providerRegistry, ensurePaymentProviders } = await import('@/lib/billing/providers/init')
  ensurePaymentProviders()

  const provider = providerRegistry.getActive()
  await provider.cancelSubscription(subscriptionId, atPeriodEnd)

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

// Re-export Prisma for type safety
// (Imported at the top)
