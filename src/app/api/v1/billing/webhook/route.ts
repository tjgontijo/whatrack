/**
 * POST /api/v1/billing/webhook
 *
 * Receives payment provider webhooks
 * Validates HMAC signature, deduplicates, and processes events
 */

import { NextRequest, NextResponse } from 'next/server'
import { billingWebhookPayloadSchema } from '@/schemas/billing/billing-schemas'
import { verifyAbacatePayWebhookSignature } from '@/lib/billing/webhook-security'
import { env } from '@/lib/env/env'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { handlePaymentWebhook } from '@/services/billing/handlers/billing-webhook.handler'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit check
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/billing/webhook')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    if (!env.ABACATEPAY_WEBHOOK_SECRET) {
      logger.warn('[Webhook/AbacatePay] Webhook secret not configured')
      return apiError('Webhook not configured', 400)
    }

    // Get raw body for signature validation
    const body = await request.text()
    // Get signature from header (X-Webhook-Signature from AbacatePay)
    const signature = request.headers.get('x-webhook-signature')

    if (!signature) {
      logger.warn(
        {
          context: {
            bodyLength: body.length,
            contentType: request.headers.get('content-type'),
          },
        },
        '[Webhook/AbacatePay] Missing signature header'
      )
      return apiError('Missing signature', 401)
    }

    if (!verifyAbacatePayWebhookSignature(body, signature, env.ABACATEPAY_WEBHOOK_SECRET)) {
      logger.warn(
        {
          context: {
            bodyLength: body.length,
            signatureLength: signature.length,
          },
        },
        '[Webhook/AbacatePay] Invalid signature'
      )
      return apiError('Invalid signature', 401)
    }

    const payloadResult = billingWebhookPayloadSchema.safeParse(JSON.parse(body))

    if (!payloadResult.success) {
      logger.warn(
        {
          context: {
            issues: payloadResult.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        },
        '[Webhook/AbacatePay] Invalid payload structure'
      )
      return apiError('Invalid webhook payload', 400)
    }

    const payload = payloadResult.data
    const eventType = payload.type ?? payload.event

    if (!eventType) {
      logger.warn('[Webhook/AbacatePay] Missing normalized event type after schema validation')
      return apiError('Invalid webhook payload', 400)
    }

    // Process webhook - normalize to expected format
    const normalizedPayload = {
      id: payload.id,
      type: eventType,
      timestamp: payload.timestamp || new Date().toISOString(),
      data: payload.data,
    }

    logger.info({ context: { eventId: payload.id, eventType } }, '[Webhook/AbacatePay] Processing event')
    const result = await handlePaymentWebhook(normalizedPayload, 'abacatepay')

    logger.info({ context: result }, '[Webhook/AbacatePay] Processing result')

    return apiSuccess({ ok: true, message: result.message, eventId: result.eventId })
  } catch (error) {
    logger.error({ err: error }, 'Webhook processing error')

    if (error instanceof SyntaxError) {
      return apiError('Invalid JSON payload', 400)
    }

    return apiError('Webhook processing failed', 500, error)
  }
}
