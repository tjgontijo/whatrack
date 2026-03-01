/**
 * Payment Webhook Handler
 *
 * Processes payment provider webhooks and updates subscription/billing state
 * Supports idempotent processing via eventId deduplication
 */

import { prisma } from '@/lib/db/prisma'
import type { WebhookPayload } from '@/lib/payments/providers/payment-provider'
import { updateSubscriptionStatus } from '../billing-subscription.service'

/**
 * Webhook event types from payment providers
 */
export type PaymentWebhookEvent = 'billing.paid' | 'subscription.created' | 'subscription.cancelled' | 'payment.failed'

/**
 * Webhook payload structure (AbacatePay v2)
 */
export interface WebhookData {
  type: PaymentWebhookEvent
  data: {
    billing?: {
      id: string
      externalId: string
      amount: number
      status: string
    }
    subscription?: {
      id: string
      externalId: string
      status: string
    }
  }
  id: string
  timestamp: string
}

/**
 * Process a payment webhook event
 * Returns true if processed successfully, false if already processed (duplicate)
 */
export async function handlePaymentWebhook(
  payload: WebhookData,
  providerId: string
): Promise<{ processed: boolean; eventId: string; message: string }> {
  const eventId = payload.id
  const eventType = payload.type
  const timestamp = new Date(payload.timestamp)

  // Check for duplicate processing
  const existing = await prisma.billingWebhookLog.findUnique({
    where: {
      eventId,
    },
  })

  if (existing && existing.isProcessed) {
    // Already processed
    return {
      processed: false,
      eventId,
      message: 'Webhook already processed',
    }
  }

  // Validate timestamp (max 5 minutes old)
  const now = new Date()
  const ageSeconds = (now.getTime() - timestamp.getTime()) / 1000
  if (ageSeconds > 5 * 60) {
    // Mark as processed even though expired, to prevent re-processing
    if (existing) {
      await prisma.billingWebhookLog.update({
        where: { id: existing.id },
        data: {
          isProcessed: true,
          processedAt: now,
        },
      })
    } else {
      await prisma.billingWebhookLog.create({
        data: {
          provider: providerId,
          eventId,
          eventType: 'expired',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: payload as any,
          isProcessed: true,
          processedAt: now,
        },
      })
    }

    return {
      processed: false,
      eventId,
      message: 'Webhook expired (older than 5 minutes)',
    }
  }

  // Create webhook log entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logId = existing?.id ?? (await createWebhookLog(providerId, eventId, eventType, timestamp, payload as any)).id

  try {
    // Process based on event type
    console.log(`[Handler/Webhook] Dispatching event: ${eventType}`)
    switch (eventType) {
      case 'billing.paid':
        await handleBillingPaid(payload.data)
        break

      case 'subscription.created':
        await handleSubscriptionCreated(payload.data)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload.data)
        break

      case 'payment.failed':
        await handlePaymentFailed(payload.data)
        break

      default:
        console.warn(`[Handler/Webhook] Received unhandled event type: ${eventType}`)
        throw new Error(`Unknown webhook event type: ${eventType}`)
    }

    // Mark as processed
    await prisma.billingWebhookLog.update({
      where: { id: logId },
      data: {
        isProcessed: true,
        processedAt: now,
      },
    })

    console.log(`[Handler/Webhook] Successfully processed ${eventType} for eventId: ${eventId}`)

    return {
      processed: true,
      eventId,
      message: `Successfully processed ${eventType} webhook`,
    }
  } catch (error) {
    // Log the error but don't throw
    console.error(`[Handler/Webhook] Error processing webhook ${eventId}:`, error)

    // Mark as attempted (but not fully processed)
    await prisma.billingWebhookLog.update({
      where: { id: logId },
      data: {
        processingError: error instanceof Error ? error.message : String(error),
        retryCount: { increment: 1 },
        lastRetryAt: now,
      },
    })

    throw error
  }
}

/**
 * Handle billing.paid event (payment received)
 * May be from subscription charge or one-time checkout
 */
async function handleBillingPaid(data: WebhookData['data']): Promise<void> {
  if (!data.billing) {
    throw new Error('Missing billing data in webhook')
  }

  const { id: billingId, externalId, status } = data.billing

  // Find subscription by externalId (organizationId)
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId: externalId },
  })

  if (!subscription) {
    console.warn(`No subscription found for externalId: ${externalId}`)
    return
  }

  // Payment received - ensure subscription is active
  // (providerBillingId is not stored, we only track subscriptions)

  // Update subscription status if payment marks it as needing status change
  if (status === 'PAID') {
    // Ensure subscription is active
    if (subscription.status !== 'active') {
      await updateSubscriptionStatus(subscription.id, 'active')
    }
  }
}

/**
 * Handle subscription.created event
 * Confirms subscription was created on provider side
 */
async function handleSubscriptionCreated(data: WebhookData['data']): Promise<void> {
  if (!data.subscription) {
    throw new Error('Missing subscription data in webhook')
  }

  const { id: providerSubId, externalId, status } = data.subscription

  // Find subscription by externalId
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId: externalId },
  })

  if (!subscription) {
    console.warn(`No subscription found for externalId: ${externalId}`)
    return
  }

  // Update provider subscription ID
  await prisma.billingSubscription.update({
    where: { id: subscription.id },
    data: {
      providerSubscriptionId: providerSubId,
      // Map provider status to our status
      status: mapProviderStatus(status),
    },
  })
}

/**
 * Handle subscription.cancelled event
 */
async function handleSubscriptionCancelled(data: WebhookData['data']): Promise<void> {
  if (!data.subscription) {
    throw new Error('Missing subscription data in webhook')
  }

  const { externalId } = data.subscription

  // Find subscription by externalId
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId: externalId },
  })

  if (!subscription) {
    console.warn(`No subscription found for externalId: ${externalId}`)
    return
  }

  // Mark as canceled
  await updateSubscriptionStatus(subscription.id, 'canceled')
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(data: WebhookData['data']): Promise<void> {
  if (!data.billing && !data.subscription) {
    throw new Error('Missing billing or subscription data in webhook')
  }

  const externalId = data.billing?.externalId || data.subscription?.externalId

  if (!externalId) {
    throw new Error('Missing externalId in webhook data')
  }

  // Find subscription by externalId
  const subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId: externalId },
  })

  if (!subscription) {
    console.warn(`No subscription found for externalId: ${externalId}`)
    return
  }

  // Mark as past_due
  await updateSubscriptionStatus(subscription.id, 'past_due')
}

/**
 * Map provider status to internal status
 */
function mapProviderStatus(providerStatus: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'active',
    PENDING: 'paused',
    CANCELLED: 'canceled',
    EXPIRED: 'canceled',
    FAILED: 'past_due',
  }
  return map[providerStatus] ?? 'past_due'
}

/**
 * Create a new webhook log entry
 */
async function createWebhookLog(
  providerId: string,
  eventId: string,
  eventType: string,
  timestamp: Date,
  payload?: unknown
) {
  return await prisma.billingWebhookLog.create({
    data: {
      provider: providerId,
      eventId,
      eventType,
      payload: payload || {},
    },
  })
}
