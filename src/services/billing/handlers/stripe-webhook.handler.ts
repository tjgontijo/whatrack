/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events and updates subscription/billing state
 */

import { prisma } from '@/lib/db/prisma'
import { updateSubscriptionStatus, createSubscription } from '../billing-subscription.service'
import type { PlanType } from '@/types/billing/billing'
import { logger } from '@/lib/utils/logger'
import Stripe from 'stripe'

/**
 * Stripe webhook event types we care about
 */
type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
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

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
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

  // Find existing subscription by organizationId
  let subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
  })

  if (!subscription) {
    // Create new subscription
    logger.info(
      { organizationId, planType, subscriptionId },
      '[Stripe] Creating new subscription'
    )

    await createSubscription({
      organizationId,
      planType: planType as PlanType,
      provider: 'stripe',
      providerCustomerId: customerId,
      providerSubscriptionId: subscriptionId,
      status: 'active',
    })
  } else {
    // Update existing subscription with Stripe IDs
    await prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
        provider: 'stripe',
        status: 'active',
      },
    })

    logger.info(
      { organizationId, subscriptionId },
      '[Stripe] Updated existing subscription with Stripe IDs'
    )
  }
}

/**
 * Handle customer.subscription.updated event
 * This can indicate plan changes, billing cycle updates, etc.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any
  const customerId = sub.customer.toString()
  const subscriptionId = sub.id

  // Find subscription by provider IDs
  const dbSubscription = await prisma.billingSubscription.findUnique({
    where: {
      providerSubscriptionId: subscriptionId,
    },
  })

  if (!dbSubscription) {
    logger.warn(
      { subscriptionId, customerId },
      '[Stripe] No subscription found for subscription update'
    )
    return
  }

  // Determine new status
  let newStatus: 'active' | 'paused' | 'canceled' | 'past_due' = (dbSubscription.status as 'active' | 'paused' | 'canceled' | 'past_due')
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

  // Update subscription status
  if (dbSubscription.status !== newStatus) {
    await updateSubscriptionStatus(dbSubscription.id, newStatus)
    logger.info(
      { organizationId: dbSubscription.organizationId, newStatus },
      '[Stripe] Updated subscription status'
    )
  }

  // Update billing period dates if available
  if (sub.current_period_start && sub.current_period_end) {
    await prisma.billingSubscription.update({
      where: { id: dbSubscription.id },
      data: {
        billingCycleStartDate: new Date((sub.current_period_start as number) * 1000),
        billingCycleEndDate: new Date((sub.current_period_end as number) * 1000),
        nextResetDate: new Date((sub.current_period_end as number) * 1000),
      },
    })
  }
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
