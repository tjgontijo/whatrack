import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import {
  AsaasProvider,
  AsaasWebhookProcessor,
  WebhookService,
  type AsaasWebhookPayload,
} from '@/services/billing'

/**
 * POST /api/v1/webhooks/asaas
 *
 * Handle Asaas webhook events.
 * Validates signature, stores event, and processes payment updates.
 */
export async function POST(request: Request) {
  try {
    // Get raw body for signature validation
    const body = await request.text()
    const signature = request.headers.get('asaas-access-token') ?? ''

    // Validate webhook signature
    const provider = new AsaasProvider()
    const validation = provider.validateWebhookSignature(body, signature)

    if (!validation.isValid) {
      console.error('[webhook/asaas] Invalid signature:', validation.error)
      return NextResponse.json(
        { error: validation.error ?? 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse payload
    let payload: AsaasWebhookPayload
    try {
      payload = JSON.parse(body)
    } catch {
      console.error('[webhook/asaas] Failed to parse payload')
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!payload.event || !payload.payment?.id) {
      console.error('[webhook/asaas] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: event, payment.id' },
        { status: 400 }
      )
    }

    const eventId = payload.payment.id
    const eventType = payload.event

    // Initialize services
    const webhookService = new WebhookService()
    const processor = new AsaasWebhookProcessor()

    // Check idempotency - skip if already processed
    const alreadyProcessed = await webhookService.isProcessed('asaas', eventId)
    if (alreadyProcessed) {
      console.log(`[webhook/asaas] Event ${eventId} already processed`)
      return NextResponse.json({ status: 'already_processed' })
    }

    // Store webhook event before processing
    await webhookService.store({
      provider: 'asaas',
      eventId,
      eventType,
      payload: payload as unknown as Prisma.InputJsonValue,
    })

    // Process the event
    try {
      const result = await processor.process(payload)

      // Mark as processed on success
      await webhookService.markProcessed('asaas', eventId)

      console.log(`[webhook/asaas] Event ${eventId} (${eventType}) processed:`, result.message)

      return NextResponse.json({
        status: 'processed',
        message: result.message,
        updatedEntities: result.updatedEntities,
      })
    } catch (processingError) {
      // Mark as failed with error
      const errorMessage = processingError instanceof Error
        ? processingError.message
        : 'Unknown processing error'

      await webhookService.markFailed('asaas', eventId, errorMessage)

      console.error(`[webhook/asaas] Event ${eventId} processing failed:`, processingError)

      // Return 200 to acknowledge receipt but indicate failure
      // This prevents Asaas from retrying immediately
      return NextResponse.json({
        status: 'processing_failed',
        error: errorMessage,
      })
    }
  } catch (error) {
    console.error('[webhook/asaas] Unexpected error:', error)

    // Return 500 for unexpected errors
    // Asaas will retry the webhook
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/webhooks/asaas
 *
 * Health check endpoint for webhook configuration.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    provider: 'asaas',
    message: 'Webhook endpoint is active',
  })
}
