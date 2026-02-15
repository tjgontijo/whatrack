/**
 * Meta Cloud WhatsApp Webhook
 * GET - Verification (hub.mode, hub.verify_token, hub.challenge)
 * POST - Receive events (messages, status updates)
 * 
 * Security: POST requests are validated via X-Hub-Signature-256 (HMAC-SHA256)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WhatsAppChatService } from '@/services/whatsapp-chat.service'
import { verifyWebhookSignature } from '@/lib/whatsapp/webhook-signature'

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
 * Receive webhook events from Meta (messages, status updates)
 * 
 * All POST requests are validated via X-Hub-Signature-256 header.
 * Meta signs every payload with HMAC-SHA256 using the App Secret as key.
 */
export async function POST(request: Request) {
    try {
        // 1. Read raw body for signature verification (must be done before .json())
        const rawBody = await request.text()
        const signatureHeader = request.headers.get('x-hub-signature-256')

        // 2. Verify webhook signature
        if (!verifyWebhookSignature(rawBody, signatureHeader)) {
            console.error('[webhook] ❌ SIGNATURE VERIFICATION FAILED — rejecting payload')
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            )
        }

        // 3. Parse the verified payload
        const payload = JSON.parse(rawBody)

        // Extract basic info from the payload
        const entry = payload.entry?.[0]
        const wabaId = entry?.id
        const changes = entry?.changes?.[0]
        const value = changes?.value
        const metadata = value?.metadata
        const phoneId = metadata?.phone_number_id

        // Find the organization and instance associated with this WhatsApp config
        let organizationId: string | null = null
        let instanceId: string | null = null

        if (phoneId || wabaId) {
            const config = await prisma.whatsAppConfig.findFirst({
                where: {
                    OR: [
                        phoneId ? { phoneId: phoneId } : null,
                        wabaId ? { wabaId: wabaId } : null,
                    ].filter((cond): cond is { phoneId: string } | { wabaId: string } => cond !== null)
                },
                select: { id: true, organizationId: true }
            })
            organizationId = config?.organizationId ?? null
            instanceId = config?.id ?? null

            // Update lastWebhookAt to track integration health
            if (config?.id) {
                await prisma.whatsAppConfig.update({
                    where: { id: config.id },
                    data: { lastWebhookAt: new Date() }
                }).catch(err => console.error('[webhook] Failed to update lastWebhookAt:', err))
            }
        }

        // Determine event type for logging
        let eventType = changes?.field || 'unknown'
        if (value?.messages) eventType = 'messages'
        else if (value?.statuses) eventType = 'statuses'
        else if (changes?.field === 'smb_message_echoes') eventType = 'smb_message_echoes'

        // Persist the payload for auditing
        try {
            await prisma.whatsAppWebhookLog.create({
                data: {
                    payload: payload as any,
                    eventType,
                    organizationId,
                }
            })
        } catch (dbError) {
            console.error('[webhook] Audit log error:', dbError)
        }

        // 0. Handle Account Updates (Life-cycle events)
        if (changes?.field === 'account_update') {
            const event = value?.event
            const targetWabaId = value?.waba_info?.waba_id

            if ((event === 'PARTNER_APP_UNINSTALLED' || event === 'PARTNER_REMOVED') && targetWabaId) {
                console.log(`[webhook] Removing instances for WABA ${targetWabaId} due to ${event}`)
                try {
                    await prisma.whatsAppConfig.updateMany({
                        where: { wabaId: targetWabaId },
                        data: {
                            status: 'disconnected',
                            disconnectedAt: new Date(),
                        }
                    })
                } catch (delError) {
                    console.error('[webhook] Error disconnecting instances:', delError)
                }
            }
        }

        // 1. Process INBOUND messages
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

        // 2. Process OUTBOUND echoes (sent from mobile app or other devices)
        const echoEvents =
            changes?.field === 'smb_message_echoes'
                ? (value?.message_echoes ?? [])
                : []

        if (echoEvents.length > 0 && instanceId) {
            for (const echo of echoEvents) {
                try {
                    await WhatsAppChatService.processMessageEcho(instanceId, echo)
                } catch (err) {
                    console.error('[webhook] Error processing echo:', echo.id, err)
                }
            }
        }

        // 3. Process STATUS updates (sent, delivered, read, failed)
        if (value?.statuses && instanceId) {
            for (const status of value.statuses) {
                try {
                    await WhatsAppChatService.processStatusUpdate(instanceId, status)
                } catch (err) {
                    console.error('[webhook] Error processing status update:', status.id, err)
                }
            }
        }

        // Always return 200 to prevent Meta from retrying
        return NextResponse.json({
            received: true,
            messagesCount: (value?.messages?.length ?? 0) + echoEvents.length,
            statusesCount: value?.statuses?.length ?? 0,
        })
    } catch (error) {
        console.error('[webhook] POST error:', error)
        // Always return 200 to prevent Meta from retrying
        return NextResponse.json({ received: true, error: 'Internal error' })
    }
}
