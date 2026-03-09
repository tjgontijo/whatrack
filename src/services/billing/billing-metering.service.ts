/**
 * Billing Metering Service
 *
 * Handles event tracking and usage metering:
 * - Recording events (lead_qualified, purchase_confirmed)
 * - Calculating current usage and overage
 * - Resetting billing cycles via scheduler
 */

import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@db/client'
import type { EventType } from '@/types/billing/billing'
import { closeExpiredSubscriptionCycleIfNeeded } from './billing-overage-closeout.service'

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

  const subscription = await loadCurrentSubscription(organizationId)

  if (externalId) {
    const existing = await prisma.billingEventUsage.findUnique({
      where: {
        subscriptionId_externalId: {
          subscriptionId: subscription.id,
          externalId,
        },
      },
      select: { id: true },
    })

    if (existing) {
      return
    }
  }

  const newUsageCount = subscription.eventsUsedInCurrentCycle + 1
  const billingCycle = new Date(subscription.billingCycleStartDate).toISOString().slice(0, 7)

  try {
    await prisma.$transaction([
      prisma.billingSubscription.update({
        where: { id: subscription.id },
        data: {
          eventsUsedInCurrentCycle: newUsageCount,
        },
      }),
      prisma.billingEventUsage.create({
        data: {
          subscriptionId: subscription.id,
          eventType,
          externalId,
          eventCount: 1,
          isOverage: false,
          chargedAmount: new Prisma.Decimal(0),
          billingCycle,
        },
      }),
    ])
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      externalId
    ) {
      return
    }

    throw error
  }
}

/**
 * Get current event usage for the active billing cycle
 */
export async function getEventUsageForCycle(
  organizationId: string
): Promise<EventUsageSummary> {
  const subscription = await loadCurrentSubscription(organizationId)

  const overage = Math.max(0, subscription.eventsUsedInCurrentCycle - subscription.eventLimitPerMonth)

  return {
    used: subscription.eventsUsedInCurrentCycle,
    limit: subscription.eventLimitPerMonth,
    overage,
    nextResetDate: subscription.nextResetDate,
    withinLimit: subscription.eventsUsedInCurrentCycle <= subscription.eventLimitPerMonth,
  }
}

async function loadCurrentSubscription(organizationId: string) {
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

  if (new Date() >= subscription.nextResetDate) {
    await closeExpiredSubscriptionCycleIfNeeded(subscription.id)

    const refreshed = await prisma.billingSubscription.findUnique({
      where: { id: subscription.id },
      select: {
        id: true,
        eventLimitPerMonth: true,
        eventsUsedInCurrentCycle: true,
        nextResetDate: true,
        planType: true,
        billingCycleStartDate: true,
      },
    })

    if (!refreshed) {
      throw new MeteringError(`Failed to refresh subscription ${subscription.id}`)
    }

    return refreshed
  }

  return subscription
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
