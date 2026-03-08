/**
 * Payment Webhook Handler
 *
 * Processes payment provider webhooks and updates subscription/billing state
 * Supports idempotent processing via eventId deduplication
 */

import { prisma } from '@/lib/db/prisma'
import type { WebhookPayload } from '@/lib/billing/providers/providers/billing-provider'
import { updateSubscriptionStatus, createSubscription } from '../billing-subscription.service'
import type { PlanType } from '@/types/billing/billing'
import { logger } from '@/lib/utils/logger'

/**
 * Webhook event types from payment providers
 */
export type PaymentWebhookEvent = 'billing.paid' | 'pix.paid' | 'pix.expired'

/**
 * Webhook payload structure (AbacatePay v1 API)
 */
export interface WebhookData {
  type: PaymentWebhookEvent
  data: {
    billing?: {
      id: string
      status: string
      amount: number
      products?: Array<{
        externalId: string
        name: string
      }>
      customer?: {
        id: string
      }
    }
    pixQrCode?: {
      id: string
      status: string
      amount: number
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
  const processedAt = new Date()

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logId = existing?.id ?? (await createWebhookLog(providerId, eventId, eventType, payload as any)).id

  try {
    logger.info(`[Handler/Webhook] Dispatching event: ${eventType}`)
    switch (eventType) {
      case 'billing.paid':
        await handleBillingPaid(payload.data)
        break

      case 'pix.paid':
        await handlePixPaid(payload.data)
        break

      case 'pix.expired':
        // PIX expired, no action needed
        logger.info(`[Handler/Webhook] PIX expired: ${payload.id}`)
        break

      default:
        logger.warn(`[Handler/Webhook] Received unhandled event type: ${eventType}`)
        throw new Error(`Unknown webhook event type: ${eventType}`)
    }

    // Mark as processed
    await prisma.billingWebhookLog.update({
      where: { id: logId },
      data: {
        isProcessed: true,
        processedAt,
      },
    })

    logger.info(`[Handler/Webhook] Successfully processed ${eventType} for eventId: ${eventId}`)

    return {
      processed: true,
      eventId,
      message: `Successfully processed ${eventType} webhook`,
    }
  } catch (error) {
    // Log the error but don't throw
    logger.error({ err: error }, `[Handler/Webhook] Error processing webhook ${eventId}`)

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
 * Handle billing.paid event (payment received)
 * Extracts organizationId from product externalId (format: org-{organizationId})
 */
async function handleBillingPaid(data: WebhookData['data']): Promise<void> {
  if (!data.billing) {
    throw new Error('Missing billing data in webhook')
  }

  const { id: billingId, status } = data.billing

  // Extract organizationId and planType from product externalId
  let organizationId: string | undefined
  let planType: PlanType | undefined

  if (data.billing.products && data.billing.products.length > 0) {
    const externalId = data.billing.products[0].externalId

    // New format: org:{organizationId}:plan:{planType}
    if (externalId.includes(':plan:')) {
      const parts = externalId.split(':')
      organizationId = parts[1]
      planType = parts[3] as PlanType
    }
    // Old format fallback: org-{organizationId}
    else if (externalId.startsWith('org-')) {
      organizationId = externalId.slice(4)
      // Infer plan type from name if possible
      const name = data.billing.products[0].name.toLowerCase()
      if (name.includes('pro')) planType = 'pro'
      else if (name.includes('starter')) planType = 'starter'
      else if (name.includes('agency')) planType = 'agency'
    }
  }

  if (!organizationId) {
    logger.warn(`Cannot extract organizationId from billing: ${billingId}`)
    return
  }

  // Find subscription by organizationId
  let subscription = await prisma.billingSubscription.findUnique({
    where: { organizationId },
  })

  // If subscription doesn't exist, create it (it's likely the first payment)
  if (!subscription) {
    if (!planType) {
      logger.warn(`No subscription found and cannot infer planType for organizationId: ${organizationId}`)
      return
    }

    logger.info({ organizationId, planType }, '[Handler/Webhook] Creating new subscription for organization')

    await createSubscription({
      organizationId,
      planType,
      provider: 'abacatepay',
      providerCustomerId: data.billing.customer?.id,
      providerSubscriptionId: billingId,
      status: 'active', // Since we just received a 'paid' event
    })

    // Fetch the newly created subscription
    subscription = await prisma.billingSubscription.findUnique({
      where: { organizationId },
    })
  }

  if (!subscription) {
    logger.error(`Failed to create or find subscription for organizationId: ${organizationId}`)
    return
  }

  // Payment received - ensure subscription is active
  if (status === 'PAID') {
    // Ensure subscription is active
    if (subscription.status !== 'active') {
      await updateSubscriptionStatus(subscription.id, 'active')
    }
  }
}

/**
 * Handle pix.paid event (PIX payment received)
 * Similar to billing.paid but for PIX QR codes
 */
async function handlePixPaid(data: WebhookData['data']): Promise<void> {
  if (!data.pixQrCode) {
    throw new Error('Missing pixQrCode data in webhook')
  }

  logger.info(
    { pixId: data.pixQrCode.id, amount: data.pixQrCode.amount },
    '[Handler/Webhook] PIX payment received'
  )
  // Note: PIX payments via standalone QR codes are not directly linked to subscriptions
  // This is mainly for informational logging
}


/**
 * Create a new webhook log entry
 */
async function createWebhookLog(
  providerId: string,
  eventId: string,
  eventType: string,
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
