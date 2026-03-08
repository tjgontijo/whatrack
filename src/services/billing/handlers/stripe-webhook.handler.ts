/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events and updates subscription/billing state
 */

import { prisma } from '@/lib/db/prisma'
import { updateSubscriptionStatus, createSubscription } from '../billing-subscription.service'
import { Prisma } from '@db/client'
import { getBillingPlan } from '@/lib/billing/plans'
import { getPlanTypeFromStripePriceId } from '@/lib/billing/stripe-price-map'
import { isPlanType, type PlanType } from '@/types/billing/billing'
import { logger } from '@/lib/utils/logger'
import Stripe from 'stripe'

/**
 * Stripe webhook event types we care about
 */
type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'

/**
 * Process a Stripe webhook event
 * Returns true if processed successfully, false if already processed (duplicate)
 */
export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<{ processed: boolean; eventId: string; message: string }> {
  const eventId = event.id
  const eventType = event.type
  const processedAt = new Date()

  // Check if already processed
  const existing = await prisma.billingWebhookLog.findUnique({
    where: {
      eventId,
    },
  })

  if (existing && existing.isProcessed) {
    return {
      processed: false,
      eventId,
      message: 'Webhook already processed',
    }
  }

  const logId = existing?.id ?? (await createWebhookLog('stripe', eventId, eventType, event)).id

  try {
    logger.info({ eventType, eventId }, '[Stripe] Processing webhook event')

    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        logger.warn({ eventType }, '[Stripe] Received unhandled event type')
        // Don't throw for unhandled events - just log and continue
        break
    }

    // Mark as processed
    await prisma.billingWebhookLog.update({
      where: { id: logId },
      data: {
        isProcessed: true,
        processedAt,
      },
    })

    logger.info({ eventType, eventId }, '[Stripe] Successfully processed webhook event')

    return {
      processed: true,
      eventId,
      message: `Successfully processed ${eventType} webhook`,
    }
  } catch (error) {
    logger.error({ err: error, eventId }, '[Stripe] Error processing webhook')

    // Mark as attempted (but not fully processed)
    await prisma.billingWebhookLog.update({
      where: { id: logId },
      data: {
        processingError: error instanceof Error ? error.message : String(error),
        retryCount: { increment: 1 },
        lastRetryAt: processedAt,
      },
    })

    throw error
  }
}

/**
 * Handle checkout.session.completed event
 * This means the user completed payment in Stripe Checkout
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const customerId = session.customer?.toString()
  const subscriptionId = session.subscription?.toString()

  if (!customerId || !subscriptionId) {
    logger.warn(
      { sessionId: session.id, customerId, subscriptionId },
      '[Stripe] Missing customer or subscription in checkout.session.completed'
    )
    return
  }

  // Get organization info from session metadata
  const organizationId = (session.metadata?.organizationId as string) || ''
  const planType = (session.metadata?.planType as string) || ''

  if (!organizationId || !planType) {
    logger.warn(
      { sessionId: session.id, organizationId, planType },
      '[Stripe] Missing organizationId or planType in session metadata'
    )
    return
  }

  const existingSubscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
  })

  if (existingSubscription) {
    await prisma.billingSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
        provider: 'stripe',
      },
    })
    logger.info({ organizationId, subscriptionId }, '[Stripe] Linked checkout session to existing subscription')
    return
  }

  logger.info(
    { organizationId, planType, subscriptionId },
    '[Stripe] Awaiting subscription webhook to create local subscription'
  )
}

/**
 * Handle customer.subscription.updated event
 * This can indicate plan changes, billing cycle updates, etc.
 */
async function handleSubscriptionUpsert(subscription: Stripe.Subscription): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any
  const customerId = sub.customer.toString()
  const subscriptionId = sub.id
  const metadata = sub.metadata as Record<string, string | undefined> | undefined
  const organizationId = metadata?.organizationId
  const planType = resolvePlanType(subscription)

  // Find subscription by provider IDs
  const dbSubscription = await prisma.billingSubscription.findUnique({
    where: {
      providerSubscriptionId: subscriptionId,
    },
  })

  // Determine new status
  let newStatus: 'active' | 'paused' | 'canceled' | 'past_due' =
    (dbSubscription?.status as 'active' | 'paused' | 'canceled' | 'past_due') ?? 'paused'
  switch (sub.status) {
    case 'active':
    case 'trialing':
      newStatus = 'active'
      break
    case 'past_due':
      newStatus = 'past_due'
      break
    case 'canceled':
      newStatus = 'canceled'
      break
    case 'incomplete':
    case 'incomplete_expired':
      newStatus = 'paused'
      break
    case 'unpaid':
      newStatus = 'past_due'
      break
  }

  const periodStart = sub.current_period_start
    ? new Date((sub.current_period_start as number) * 1000)
    : new Date()
  const periodEnd = sub.current_period_end
    ? new Date((sub.current_period_end as number) * 1000)
    : new Date(periodStart)
  const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end)

  if (!dbSubscription) {
    if (!organizationId || !planType) {
      logger.warn(
        { subscriptionId, customerId },
        '[Stripe] Missing organization metadata for subscription upsert'
      )
      return
    }

    await createSubscription({
      organizationId,
      planType: planType as PlanType,
      provider: 'stripe',
      providerCustomerId: customerId,
      providerSubscriptionId: subscriptionId,
      status: newStatus,
      billingCycleStartDate: periodStart,
      billingCycleEndDate: periodEnd,
      nextResetDate: periodEnd,
      canceledAtPeriodEnd: cancelAtPeriodEnd,
    })

    logger.info(
      { organizationId, subscriptionId, newStatus },
      '[Stripe] Created subscription from Stripe subscription webhook'
    )
    return
  }

  const resolvedPlan = planType ? getBillingPlan(planType) : null

  await prisma.billingSubscription.update({
    where: { id: dbSubscription.id },
    data: {
      providerCustomerId: customerId,
      providerSubscriptionId: subscriptionId,
      provider: 'stripe',
      status: newStatus,
      canceledAtPeriodEnd: cancelAtPeriodEnd,
      billingCycleStartDate: periodStart,
      billingCycleEndDate: periodEnd,
      nextResetDate: periodEnd,
      ...(resolvedPlan
        ? {
            planType: resolvedPlan.id,
            eventLimitPerMonth: resolvedPlan.eventLimitPerMonth,
            overagePricePerEvent: new Prisma.Decimal(
              resolvedPlan.overagePricePerEvent,
            ),
          }
        : {}),
      ...(newStatus === 'canceled' ? { canceledAt: new Date() } : { canceledAt: null }),
    },
  })

  logger.info(
    { organizationId: dbSubscription.organizationId, newStatus, cancelAtPeriodEnd },
    '[Stripe] Upserted subscription from Stripe webhook'
  )
}

/**
 * Handle customer.subscription.deleted event
 * Subscription was canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionId = subscription.id

  // Find subscription
  const dbSubscription = await prisma.billingSubscription.findUnique({
    where: {
      providerSubscriptionId: subscriptionId,
    },
  })

  if (!dbSubscription) {
    logger.warn({ subscriptionId }, '[Stripe] No subscription found for deletion')
    return
  }

  // Mark as canceled
  await updateSubscriptionStatus(dbSubscription.id, 'canceled')

  logger.info(
    { organizationId: dbSubscription.organizationId, subscriptionId },
    '[Stripe] Subscription canceled'
  )
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any
  const subscriptionId = inv.subscription?.toString()

  if (!subscriptionId) {
    logger.warn({ invoiceId: invoice.id }, '[Stripe] Missing subscription in invoice.paid')
    return
  }

  const dbSubscription = await prisma.billingSubscription.findUnique({
    where: { providerSubscriptionId: subscriptionId },
  })

  if (!dbSubscription) {
    logger.warn({ subscriptionId }, '[Stripe] No subscription found for invoice payment')
    return
  }

  if (dbSubscription.status !== 'active') {
    await updateSubscriptionStatus(dbSubscription.id, 'active')
  }

  logger.info(
    { organizationId: dbSubscription.organizationId, subscriptionId },
    '[Stripe] Invoice paid - subscription marked active'
  )
}

/**
 * Handle invoice.payment_failed event
 * Payment couldn't be processed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any
  const customerId = inv.customer?.toString()
  const subscriptionId = inv.subscription?.toString()

  if (!customerId || !subscriptionId) {
    logger.warn(
      { invoiceId: invoice.id, customerId, subscriptionId },
      '[Stripe] Missing customer or subscription in payment_failed'
    )
    return
  }

  // Find subscription
  const dbSubscription = await prisma.billingSubscription.findUnique({
    where: {
      providerSubscriptionId: subscriptionId as string,
    },
  })

  if (!dbSubscription) {
    logger.warn({ subscriptionId }, '[Stripe] No subscription found for payment failure')
    return
  }

  // Mark as past_due
  await updateSubscriptionStatus(dbSubscription.id, 'past_due')

  logger.info(
    { organizationId: dbSubscription.organizationId, subscriptionId },
    '[Stripe] Payment failed - subscription marked past due'
  )
}

/**
 * Create a new webhook log entry
 */
async function createWebhookLog(providerId: string, eventId: string, eventType: string, payload?: unknown) {
  return await prisma.billingWebhookLog.create({
    data: {
      provider: providerId,
      eventId,
      eventType,
      payload: payload || {},
    },
  })
}

function resolvePlanType(subscription: Stripe.Subscription): PlanType | null {
  const priceId = subscription.items.data[0]?.price?.id
  const planTypeFromPrice = getPlanTypeFromStripePriceId(priceId)
  if (planTypeFromPrice) {
    return planTypeFromPrice
  }

  const metadataPlanType = subscription.metadata?.planType
  if (metadataPlanType && isPlanType(metadataPlanType)) {
    return metadataPlanType
  }

  return null
}
