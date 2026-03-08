/**
 * Stripe Webhook Endpoint
 *
 * Receives and processes Stripe webhook events with signature verification.
 * POST /api/v1/billing/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { handleStripeWebhook } from '@/services/billing/handlers/stripe-webhook.handler'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured')
      return apiError('Webhook not configured', 400)
    }

    // Get raw body as text (required for Stripe signature verification)
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      logger.warn('[Stripe] Missing stripe-signature header')
      return apiError('Missing signature', 400)
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.warn({ message }, '[Stripe] Signature verification failed')
      return apiError('Signature verification failed', 401)
    }

    // Process the event
    const result = await handleStripeWebhook(event)

    if (!result.processed) {
      logger.debug({ eventId: result.eventId }, '[Stripe] Webhook already processed')
      return NextResponse.json(
        { ok: true, eventId: result.eventId, message: result.message },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { ok: true, eventId: result.eventId, message: result.message },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error }, '[Stripe] Webhook processing error')
    return apiError(
      'Webhook processing failed',
      500,
      error instanceof Error ? error.message : undefined
    )
  }
}
