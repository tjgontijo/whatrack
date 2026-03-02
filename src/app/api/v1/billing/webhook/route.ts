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
 * AbacatePay uses a fixed public key for all webhook signatures
 * Reference: https://docs.abacatepay.com/pages/webhooks
 */
function validateWebhookSignature(payload: string, signature: string): boolean {
  // Public key from AbacatePay (fixed for all webhooks)
  const publicKey = 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

  // Create HMAC-SHA256 hash using the public key
  const hash = crypto.createHmac('sha256', publicKey).update(payload).digest('base64')
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

    // Get signature from header (X-Webhook-Signature from AbacatePay)
    const signature = request.headers.get('x-webhook-signature')

    if (!signature) {
      logger.warn({ headers: Object.keys(allHeaders) }, 'Webhook received without x-webhook-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    logger.info({ signature: signature.substring(0, 20) + '...' }, '[Webhook/AbacatePay] Signature received')

    // Validate signature using AbacatePay's public key
    if (!validateWebhookSignature(body, signature)) {
      const publicKey = 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'
      const computedHash = crypto.createHmac('sha256', publicKey).update(body).digest('base64')
      logger.warn(
        {
          signature: signature,
          computedHash: computedHash,
          bodyLength: body.length,
          bodyPreview: body.substring(0, 100),
        },
        'Webhook signature validation failed'
      )
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    logger.info('[Webhook/AbacatePay] Signature validated successfully')

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
