/**
 * POST /api/v1/billing/webhook
 *
 * Receives payment provider webhooks
 * Validates HMAC signature, deduplicates, and processes events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { env } from '@/lib/env/env'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { handlePaymentWebhook } from '@/services/billing/handlers/payment-webhook.handler'
import { logger } from '@/lib/utils/logger'

/**
 * Validate webhook signature using HMAC-SHA256
 * AbacatePay sends signature in Base64 format
 */
function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // Create HMAC-SHA256 hash
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('base64')
  return hash === signature
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit check
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/billing/webhook')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Get raw body for signature validation
    const body = await request.text()
    const payload = JSON.parse(body)

    // Debug: Log all headers for webhook signature investigation
    const allHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      allHeaders[key] = value
    })
    logger.info({ headers: allHeaders }, '[Webhook/Debug] All request headers')

    // Get signature and secret from headers
    const signature = request.headers.get('x-webhook-signature')
    const webhookSecret = request.headers.get('x-webhook-secret')

    if (!signature) {
      logger.warn({ headers: Object.keys(allHeaders) }, 'Webhook received without x-webhook-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    if (!webhookSecret) {
      logger.warn({ headers: Object.keys(allHeaders) }, 'Webhook received without x-webhook-secret header')
      return NextResponse.json(
        { error: 'Missing webhook secret' },
        { status: 401 }
      )
    }

    logger.info({ signature: signature.substring(0, 20) + '...' }, '[Webhook/Debug] Signature received')

    // Validate signature (AbacatePay uses Base64 format)
    if (!validateWebhookSignature(body, signature, webhookSecret)) {
      logger.warn(
        { signature: signature.substring(0, 20) + '...', bodyHash: crypto.createHmac('sha256', webhookSecret).update(body).digest('base64').substring(0, 20) + '...' },
        'Webhook signature validation failed'
      )
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Validate payload structure
    // AbacatePay sends "event" field, not "type"
    const eventType = payload.type || payload.event
    if (!payload.id || !eventType || !payload.data) {
      logger.warn({ payload: JSON.stringify(payload).substring(0, 200) }, 'Invalid webhook payload structure')
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Process webhook - normalize to expected format
    const normalizedPayload = {
      id: payload.id,
      type: eventType,
      timestamp: payload.timestamp || new Date().toISOString(),
      data: payload.data,
    }

    logger.info(`[Webhook/AbacatePay] Processing event type: ${eventType}, id: ${payload.id}`)
    const result = await handlePaymentWebhook(normalizedPayload, 'abacatepay')

    logger.info({ context: result }, '[Webhook/AbacatePay] Processing result')

    if (!result.processed) {
      // Idempotent success - already processed or expired
      return NextResponse.json(
        { ok: true, message: result.message, eventId: result.eventId },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { ok: true, message: result.message, eventId: result.eventId },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Webhook processing error')

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
