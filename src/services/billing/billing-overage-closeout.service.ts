import { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import { ensurePaymentProviders, providerRegistry } from '@/lib/billing/providers/init'
import { logger } from '@/lib/utils/logger'

const BILLING_CYCLE_DAYS = 30
const FINAL_CLOSEOUT_STATUSES = ['invoiced', 'no_overage', 'trial_skipped'] as const

type FinalCloseoutStatus = (typeof FINAL_CLOSEOUT_STATUSES)[number]
type BillingCloseoutStatus = FinalCloseoutStatus | 'processing' | 'failed'

export type BillingCycleCloseoutResult =
  | { status: 'not-due'; subscriptionId: string }
  | { status: 'already-processed'; subscriptionId: string; closeoutId: string }
  | {
      status: FinalCloseoutStatus
      subscriptionId: string
      closeoutId: string
      overageEvents: number
      amountCharged: string
      providerInvoiceItemId: string | null
    }

function formatBillingCycle(date: Date) {
  return date.toISOString().slice(0, 7)
}

function decimalToCents(value: Prisma.Decimal) {
  return Math.round(Number(value) * 100)
}

function getNextCycleEnd(cycleStartDate: Date) {
  return new Date(cycleStartDate.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000)
}

function isFinalCloseoutStatus(status: string): status is FinalCloseoutStatus {
  return FINAL_CLOSEOUT_STATUSES.includes(status as FinalCloseoutStatus)
}

async function markOverageEvents(params: {
  subscriptionId: string
  billingCycle: string
  eventLimit: number
  overageEvents: number
  unitPrice: Prisma.Decimal
}) {
  if (params.overageEvents <= 0) return

  const rows = await prisma.billingEventUsage.findMany({
    where: {
      subscriptionId: params.subscriptionId,
      billingCycle: params.billingCycle,
    },
    orderBy: [{ recordedAt: 'asc' }, { createdAt: 'asc' }],
    skip: params.eventLimit,
    take: params.overageEvents,
    select: { id: true },
  })

  if (rows.length === 0) return

  await prisma.billingEventUsage.updateMany({
    where: {
      id: { in: rows.map((row) => row.id) },
    },
    data: {
      isOverage: true,
      chargedAmount: params.unitPrice,
    },
  })
}

async function getOrCreateCloseoutRecord(params: {
  subscriptionId: string
  billingCycle: string
  cycleStartDate: Date
  cycleEndDate: Date
  eventsUsed: number
  eventLimit: number
  overageEvents: number
  unitPrice: Prisma.Decimal
  amountCharged: Prisma.Decimal
  currency: string
  provider: string
}) {
  const existing = await prisma.billingCycleCloseout.findUnique({
    where: {
      subscriptionId_cycleStartDate_cycleEndDate: {
        subscriptionId: params.subscriptionId,
        cycleStartDate: params.cycleStartDate,
        cycleEndDate: params.cycleEndDate,
      },
    },
  })

  if (existing) return existing

  return prisma.billingCycleCloseout.create({
    data: {
      subscriptionId: params.subscriptionId,
      billingCycle: params.billingCycle,
      cycleStartDate: params.cycleStartDate,
      cycleEndDate: params.cycleEndDate,
      eventsUsed: params.eventsUsed,
      eventLimit: params.eventLimit,
      overageEvents: params.overageEvents,
      unitPrice: params.unitPrice,
      amountCharged: params.amountCharged,
      currency: params.currency,
      provider: params.provider,
      status: 'processing',
    },
  })
}

async function persistSuccessfulCloseout(params: {
  closeoutId: string
  subscriptionId: string
  status: FinalCloseoutStatus
  providerInvoiceItemId: string | null
  cycleEndDate: Date
}) {
  const nextCycleStart = params.cycleEndDate
  const nextCycleEnd = getNextCycleEnd(nextCycleStart)

  await prisma.$transaction([
    prisma.billingCycleCloseout.update({
      where: { id: params.closeoutId },
      data: {
        status: params.status,
        providerInvoiceItemId: params.providerInvoiceItemId,
        errorMessage: null,
        processedAt: new Date(),
      },
    }),
    prisma.billingSubscription.update({
      where: { id: params.subscriptionId },
      data: {
        eventsUsedInCurrentCycle: 0,
        billingCycleStartDate: nextCycleStart,
        billingCycleEndDate: nextCycleEnd,
        nextResetDate: nextCycleEnd,
      },
    }),
  ])
}

export async function closeExpiredSubscriptionCycleIfNeeded(
  subscriptionId: string,
  now: Date = new Date(),
): Promise<BillingCycleCloseoutResult> {
  const subscription = await prisma.billingSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      organizationId: true,
      provider: true,
      providerCustomerId: true,
      eventLimitPerMonth: true,
      overagePricePerEvent: true,
      billingCycleStartDate: true,
      billingCycleEndDate: true,
      nextResetDate: true,
      trialEndsAt: true,
      plan: {
        select: {
          name: true,
          currency: true,
        },
      },
    },
  })

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`)
  }

  if (subscription.nextResetDate > now) {
    return {
      status: 'not-due',
      subscriptionId,
    }
  }

  const billingCycle = formatBillingCycle(subscription.billingCycleStartDate)
  const aggregate = await prisma.billingEventUsage.aggregate({
    where: {
      subscriptionId,
      billingCycle,
    },
    _sum: {
      eventCount: true,
    },
  })

  const eventsUsed = aggregate._sum.eventCount ?? 0
  const overageEvents = Math.max(0, eventsUsed - subscription.eventLimitPerMonth)
  const amountCharged = new Prisma.Decimal(overageEvents).mul(
    subscription.overagePricePerEvent,
  )
  const closeout = await getOrCreateCloseoutRecord({
    subscriptionId,
    billingCycle,
    cycleStartDate: subscription.billingCycleStartDate,
    cycleEndDate: subscription.billingCycleEndDate,
    eventsUsed,
    eventLimit: subscription.eventLimitPerMonth,
    overageEvents,
    unitPrice: subscription.overagePricePerEvent,
    amountCharged,
    currency: subscription.plan?.currency ?? 'BRL',
    provider: subscription.provider,
  })

  if (isFinalCloseoutStatus(closeout.status)) {
    return {
      status: 'already-processed',
      subscriptionId,
      closeoutId: closeout.id,
    }
  }

  try {
    const isTrialCycle = Boolean(
      subscription.trialEndsAt && subscription.billingCycleEndDate <= subscription.trialEndsAt,
    )

    if (isTrialCycle) {
      await persistSuccessfulCloseout({
        closeoutId: closeout.id,
        subscriptionId,
        status: 'trial_skipped',
        providerInvoiceItemId: null,
        cycleEndDate: subscription.billingCycleEndDate,
      })

      return {
        status: 'trial_skipped',
        subscriptionId,
        closeoutId: closeout.id,
        overageEvents,
        amountCharged: amountCharged.toString(),
        providerInvoiceItemId: null,
      }
    }

    if (overageEvents <= 0 || amountCharged.lte(0)) {
      await persistSuccessfulCloseout({
        closeoutId: closeout.id,
        subscriptionId,
        status: 'no_overage',
        providerInvoiceItemId: null,
        cycleEndDate: subscription.billingCycleEndDate,
      })

      return {
        status: 'no_overage',
        subscriptionId,
        closeoutId: closeout.id,
        overageEvents,
        amountCharged: amountCharged.toString(),
        providerInvoiceItemId: null,
      }
    }

    if (!subscription.providerCustomerId) {
      throw new Error('Subscription is missing provider customer ID for overage charge')
    }

    ensurePaymentProviders()
    const provider = providerRegistry.getActive()

    if (!provider.createInvoiceItem) {
      throw new Error(`Provider ${provider.getProviderId()} does not support invoice items`)
    }

    const invoiceItem = await provider.createInvoiceItem({
      customerId: subscription.providerCustomerId,
      amountInCents: decimalToCents(amountCharged),
      currency: subscription.plan?.currency ?? 'BRL',
      description: `Excedente de eventos (${overageEvents}) - ${
        subscription.plan?.name ?? 'Plano'
      } - ciclo ${billingCycle}`,
      metadata: {
        closeoutId: closeout.id,
        subscriptionId,
        organizationId: subscription.organizationId,
        billingCycle,
        overageEvents: String(overageEvents),
      },
      idempotencyKey: `billing-closeout:${closeout.id}`,
    })

    await markOverageEvents({
      subscriptionId,
      billingCycle,
      eventLimit: subscription.eventLimitPerMonth,
      overageEvents,
      unitPrice: subscription.overagePricePerEvent,
    })

    await persistSuccessfulCloseout({
      closeoutId: closeout.id,
      subscriptionId,
      status: 'invoiced',
      providerInvoiceItemId: invoiceItem.id,
      cycleEndDate: subscription.billingCycleEndDate,
    })

    return {
      status: 'invoiced',
      subscriptionId,
      closeoutId: closeout.id,
      overageEvents,
      amountCharged: amountCharged.toString(),
      providerInvoiceItemId: invoiceItem.id,
    }
  } catch (error) {
    await prisma.billingCycleCloseout.update({
      where: { id: closeout.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    })

    logger.error({ err: error, subscriptionId, closeoutId: closeout.id }, '[BillingCloseout] Error')
    throw error
  }
}

export async function closeDueBillingCycles(now: Date = new Date()) {
  const dueSubscriptions = await prisma.billingSubscription.findMany({
    where: {
      nextResetDate: { lte: now },
      status: { in: ['active', 'past_due'] },
    },
    select: { id: true },
    orderBy: { nextResetDate: 'asc' },
  })

  const results: BillingCycleCloseoutResult[] = []

  for (const subscription of dueSubscriptions) {
    results.push(await closeExpiredSubscriptionCycleIfNeeded(subscription.id, now))
  }

  return {
    processed: results.filter((result) => result.status !== 'not-due').length,
    invoiced: results.filter((result) => result.status === 'invoiced').length,
    skippedTrial: results.filter((result) => result.status === 'trial_skipped').length,
    noOverage: results.filter((result) => result.status === 'no_overage').length,
    alreadyProcessed: results.filter((result) => result.status === 'already-processed').length,
  }
}
