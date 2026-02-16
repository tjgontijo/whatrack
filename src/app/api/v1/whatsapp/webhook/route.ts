/**
 * Meta Cloud WhatsApp Webhook
 * GET - Verification (hub.mode, hub.verify_token, hub.challenge)
 * POST - Receive events (messages, status updates, account updates)
 *
 * Security: POST requests are validated via X-Hub-Signature-256 (HMAC-SHA256)
 *
 * Dead Letter Queue (DLQ):
 * - All webhooks are logged with processed=false
 * - If processing succeeds, processed=true
 * - Failed webhooks are retried every 5 minutes (max 3 attempts)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WhatsAppChatService } from '@/services/whatsapp-chat.service'
import { verifyWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { WebhookProcessor } from '@/services/whatsapp/webhook-processor'

export const dynamic = 'force-dynamic'

// Webhook verification token - should match what's configured in Meta Developer Portal
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN

/**
 * GET /api/v1/whatsapp/webhook
 * Webhook verification endpoint for Meta
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('[webhook] GET verification:', { mode, token: token ? '***' : null })

    // Verify the request
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[webhook] Verification successful')
        // Meta expects the challenge as plain text response
        return new Response(challenge ?? '', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        })
    }

    console.error('[webhook] Verification failed: invalid token or mode')
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST /api/v1/whatsapp/webhook
 * Receive webhook events from Meta
 *
 * All POST requests are validated via X-Hub-Signature-256 header.
 * Meta signs every payload with HMAC-SHA256 using the App Secret as key.
 *
 * DLQ Flow:
 * 1. Create webhook log with processed=false
 * 2. Verify signature
 * 3. Process with WebhookProcessor
 * 4. Mark processed=true only if successful
 * 5. If error, DLQ retry job picks it up every 5 minutes
 */
export async function POST(request: Request) {
    let webhookLogId: string | null = null

    try {
        // 1. Read raw body for signature verification
        const rawBody = await request.text()
        const signatureHeader = request.headers.get('x-hub-signature-256')
        const payload = JSON.parse(rawBody)

        // Extract event type for logging
        let eventType: string | null = null
        const changes = payload.entry?.[0]?.changes?.[0]
        if (changes?.field === 'account_update') {
            eventType = payload.entry?.[0]?.changes?.[0]?.value?.event || 'account_update'
        } else if (changes?.field) {
            eventType = changes.field
        }

        // 2. Log webhook BEFORE processing (for DLQ)
        try {
            const log = await prisma.whatsAppWebhookLog.create({
                data: {
                    payload: payload,
                    eventType,
                    processed: false,
                    signatureValid: false, // Will update after verification
                }
            })
            webhookLogId = log.id
        } catch (logError) {
            console.error('[webhook] Failed to create log entry:', logError)
        }

        // 3. Verify webhook signature
        const isValidSignature = verifyWebhookSignature(rawBody, signatureHeader)

        if (webhookLogId) {
            await prisma.whatsAppWebhookLog.update({
                where: { id: webhookLogId },
                data: { signatureValid: isValidSignature }
            }).catch(err => console.error('[webhook] Failed to update signature status:', err))
        }

        if (!isValidSignature) {
            console.error('[webhook] ❌ SIGNATURE VERIFICATION FAILED')
            if (webhookLogId) {
                await prisma.whatsAppWebhookLog.update({
                    where: { id: webhookLogId },
                    data: { processingError: 'Invalid signature' }
                }).catch(() => {})
            }
            return NextResponse.json({ received: true })
        }

        // 4. Process with WebhookProcessor (handles both new v2 and legacy v1 events)
        const processor = new WebhookProcessor()
        try {
            await processor.process(payload)
        } catch (processorError) {
            console.error('[webhook] Processor error:', processorError)
            if (webhookLogId) {
                await prisma.whatsAppWebhookLog.update({
                    where: { id: webhookLogId },
                    data: {
                        processingError: processorError instanceof Error ? processorError.message : 'Unknown error'
                    }
                }).catch(() => {})
            }
            // Don't throw - let DLQ retry it
        }

        // 5. Process legacy chat messages (v1 compatibility)
        const changes_field = changes?.field
        const value = changes?.value
        const metadata = value?.metadata
        const phoneId = metadata?.phone_number_id
        const wabaId = payload.entry?.[0]?.id

        let instanceId: string | null = null
        if (phoneId || wabaId) {
            const config = await prisma.whatsAppConfig.findFirst({
                where: {
                    OR: [
                        phoneId ? { phoneId: phoneId } : null,
                        wabaId ? { wabaId: wabaId } : null,
                    ].filter((cond): cond is { phoneId: string } | { wabaId: string } => cond !== null)
                },
                select: { id: true }
            })
            instanceId = config?.id ?? null

            if (config?.id) {
                await prisma.whatsAppConfig.update({
                    where: { id: config.id },
                    data: { lastWebhookAt: new Date() }
                }).catch(err => console.error('[webhook] Failed to update lastWebhookAt:', err))
            }
        }

        // Handle legacy message processing
        if (value?.messages && instanceId) {
            for (const msg of value.messages) {
                try {
                    const contactProfile = value.contacts?.find((c: any) => c.wa_id === msg.from)
                    await WhatsAppChatService.processIncomingMessage(
                        instanceId,
                        msg,
                        contactProfile ? { name: contactProfile.profile.name } : undefined
                    )
                } catch (err) {
                    console.error('[webhook] Error processing message:', msg.id, err)
                }
            }
        }

        // Handle echo events
        const echoEvents = changes_field === 'smb_message_echoes' ? (value?.message_echoes ?? []) : []
        if (echoEvents.length > 0 && instanceId) {
            for (const echo of echoEvents) {
                try {
                    await WhatsAppChatService.processMessageEcho(instanceId, echo)
                } catch (err) {
                    console.error('[webhook] Error processing echo:', echo.id, err)
                }
            }
        }

        // Handle status updates
        if (value?.statuses && instanceId) {
            for (const status of value.statuses) {
                try {
                    await WhatsAppChatService.processStatusUpdate(instanceId, status)
                } catch (err) {
                    console.error('[webhook] Error processing status update:', status.id, err)
                }
            }
        }

        // 6. Mark as processed ONLY if everything succeeded
        if (webhookLogId) {
            await prisma.whatsAppWebhookLog.update({
                where: { id: webhookLogId },
                data: {
                    processed: true,
                    processedAt: new Date()
                }
            }).catch(err => console.error('[webhook] Failed to mark processed:', err))
        }

        // Always return 200 to Meta
        return NextResponse.json({
            received: true,
            logId: webhookLogId,
        })
    } catch (error) {
        console.error('[webhook] POST error:', error)
        // Always return 200 to prevent Meta from retrying
        return NextResponse.json({ received: true })
    }
}
