/**
 * Billing Metering Service
 *
 * Handles event tracking and usage metering:
 * - Recording events (lead_qualified, purchase_confirmed)
 * - Calculating current usage and overage
 * - Resetting billing cycles via scheduler
 */

import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { BILLING_CYCLE_DAYS, PLAN_LIMITS } from '@/lib/payments/metering-constants'
import type { EventType } from '@/types/billing/billing'

/**
 * Custom domain errors
 */
export class MeteringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MeteringError'
  }
}

export class NoActiveSubscriptionError extends Error {
  constructor(organizationId: string) {
    super(`No active subscription found for organization ${organizationId}`)
    this.name = 'NoActiveSubscriptionError'
  }
}

/**
 * Parameters for recording an event
 */
export interface RecordEventParams {
  organizationId: string
  eventType: EventType
  externalId?: string
}

/**
 * Event usage summary for a billing cycle
 */
export interface EventUsageSummary {
  used: number
  limit: number
  overage: number
  nextResetDate: Date
  withinLimit: boolean
}

/**
 * Record an event and update usage
 */
export async function recordEvent(params: RecordEventParams): Promise<void> {
  const { organizationId, eventType, externalId } = params

  // Get active subscription
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      eventLimitPerMonth: true,
      eventsUsedInCurrentCycle: true,
      nextResetDate: true,
      planType: true,
      billingCycleStartDate: true,
    },
  })

  if (!subscription) {
    throw new NoActiveSubscriptionError(organizationId)
  }

  // Check if billing cycle needs reset
  const now = new Date()
  if (now > subscription.nextResetDate) {
    // Cycle has ended, reset it
    await resetBillingCycle(subscription.id)
    // Refresh subscription data
    const refreshed = await prisma.billingSubscription.findUnique({
      where: { id: subscription.id },
      select: {
        eventLimitPerMonth: true,
        eventsUsedInCurrentCycle: true,
        nextResetDate: true,
        planType: true,
      },
    })

    if (!refreshed) {
      throw new MeteringError(`Failed to refresh subscription ${subscription.id}`)
    }

    Object.assign(subscription, refreshed)
  }

  // Increment event counter
  const newUsageCount = subscription.eventsUsedInCurrentCycle + 1

  // Update subscription with new usage
  await prisma.billingSubscription.update({
    where: { id: subscription.id },
    data: {
      eventsUsedInCurrentCycle: newUsageCount,
    },
  })

  // Record event in usage log
  const isOverage = newUsageCount > subscription.eventLimitPerMonth
  const chargedAmount = new Prisma.Decimal(0) // TODO: Calculate overage charge based on plan

  const billingCycle = new Date(subscription.billingCycleStartDate).toISOString().slice(0, 7) // YYYY-MM

  await prisma.billingEventUsage.create({
    data: {
      subscriptionId: subscription.id,
      eventType,
      eventCount: 1,
      chargedAmount,
      billingCycle,
    },
  })
}

/**
 * Get current event usage for the active billing cycle
 */
export async function getEventUsageForCycle(
  organizationId: string
): Promise<EventUsageSummary> {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      eventLimitPerMonth: true,
      eventsUsedInCurrentCycle: true,
      nextResetDate: true,
      planType: true,
    },
  })

  if (!subscription) {
    throw new NoActiveSubscriptionError(organizationId)
  }

  // Check if cycle needs reset
  const now = new Date()
  if (now > subscription.nextResetDate) {
    await resetBillingCycle(subscription.id)
    // Refresh
    const refreshed = await prisma.billingSubscription.findUnique({
      where: { id: subscription.id },
      select: {
        eventLimitPerMonth: true,
        eventsUsedInCurrentCycle: true,
        nextResetDate: true,
        planType: true,
      },
    })

    if (!refreshed) {
      throw new MeteringError(`Failed to refresh subscription ${subscription.id}`)
    }

    Object.assign(subscription, refreshed)
  }

  const overage = Math.max(0, subscription.eventsUsedInCurrentCycle - subscription.eventLimitPerMonth)

  return {
    used: subscription.eventsUsedInCurrentCycle,
    limit: subscription.eventLimitPerMonth,
    overage,
    nextResetDate: subscription.nextResetDate,
    withinLimit: subscription.eventsUsedInCurrentCycle <= subscription.eventLimitPerMonth,
  }
}

/**
 * Reset billing cycle for a subscription
 * Called by scheduler when billing period ends
 */
export async function resetBillingCycle(subscriptionId: string): Promise<void> {
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

/**
 * Get all events recorded in current cycle (for analytics/debugging)
 */
export async function getEventsByOrganization(
  organizationId: string
): Promise<
  Array<{
    id: string
    eventType: string
    eventCount: number
    chargedAmount: string
    createdAt: Date
  }>
> {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
    select: { id: true },
  })

  if (!subscription) {
    throw new NoActiveSubscriptionError(organizationId)
  }

  const events = await prisma.billingEventUsage.findMany({
    where: { subscriptionId: subscription.id },
    select: {
      id: true,
      eventType: true,
      eventCount: true,
      chargedAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Convert Decimal to string for serialization
  return events.map((e) => ({
    ...e,
    chargedAmount: e.chargedAmount.toString(),
  }))
}
