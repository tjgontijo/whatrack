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

/**
 * Validate webhook signature using HMAC-SHA256
 */
function validateWebhookSignature(payload: string, signature: string): boolean {
  const secret = env.ABACATEPAY_WEBHOOK_SECRET
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex')
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

    // Get signature from header
    const signature = request.headers.get('x-signature') || request.headers.get('authorization')
    if (!signature) {
      console.warn('Webhook received without signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Validate signature
    if (!validateWebhookSignature(body, signature)) {
      console.warn('Webhook signature validation failed')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Validate payload structure
    if (!payload.id || !payload.type || !payload.timestamp) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Process webhook
    console.log(`[Webhook/AbacatePay] Processing event type: ${payload.type}, id: ${payload.id}`)
    const result = await handlePaymentWebhook(payload, 'abacatepay')

    console.log('[Webhook/AbacatePay] Processing result:', result)

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
    console.error('Webhook processing error:', error)

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
