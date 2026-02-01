/**
 * Meta Cloud WhatsApp Webhook
 * GET - Verification (hub.mode, hub.verify_token, hub.challenge)
 * POST - Receive events (messages, status updates) - placeholder for future implementation
 */

import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Webhook verification token - should match what's configured in Meta Developer Portal
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN

/**
 * GET /api/v1/whatsapp/meta-cloud/webhook
 * Webhook verification endpoint for Meta
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('[meta-cloud/webhook] GET verification:', { mode, token: token ? '***' : null })

    // Verify the request
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[meta-cloud/webhook] Verification successful')
        // Meta expects the challenge as plain text response
        return new Response(challenge ?? '', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        })
    }

    console.error('[meta-cloud/webhook] Verification failed: invalid token or mode')
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST /api/v1/whatsapp/meta-cloud/webhook
 * Receive webhook events from Meta (messages, status updates)
 * 
 * TODO: Implement message processing after new WhatsApp infrastructure is set up
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json()

        console.log('[meta-cloud/webhook] POST received:', JSON.stringify(payload).slice(0, 500))

        // Extract basic info from the payload
        const entry = payload.entry?.[0]
        const wabaId = entry?.id
        const changes = entry?.changes?.[0]
        const value = changes?.value
        const phoneId = value?.metadata?.phone_number_id

        // Find the organization associated with this WhatsApp config
        let organizationId: string | null = null
        if (phoneId || wabaId) {
            console.log('[meta-cloud/webhook] Searching for config with:', { phoneId, wabaId })
            const config = await prisma.whatsAppConfig.findFirst({
                where: {
                    OR: [
                        phoneId ? { phoneId: phoneId } : null,
                        wabaId ? { wabaId: wabaId } : null,
                    ].filter((cond): cond is { phoneId: string } | { wabaId: string } => cond !== null)
                },
                select: { organizationId: true }
            })
            console.log('[meta-cloud/webhook] Found config:', config)
            organizationId = config?.organizationId ?? null
        }

        // Determine event type for logging
        let eventType = 'unknown'
        if (value?.messages) eventType = 'messages'
        else if (value?.statuses) eventType = 'statuses'
        else if (changes?.field) eventType = changes.field // e.g., "message_template_status_update"

        console.log('[meta-cloud/webhook] Event type:', eventType, 'Org ID:', organizationId)

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
            console.error('[meta-cloud/webhook] Audit log error:', dbError)
            // Continue even if logging fails
        }

        // Log received data for debugging
        if (value?.messages) {
            console.log('[meta-cloud/webhook] Messages received:', value.messages.length)
            for (const msg of value.messages) {
                console.log('[meta-cloud/webhook] Message:', {
                    from: msg.from,
                    type: msg.type,
                    timestamp: msg.timestamp,
                    text: msg.text?.body?.slice(0, 100),
                })
            }
        }

        if (value?.statuses) {
            console.log('[meta-cloud/webhook] Statuses received:', value.statuses.length)
            for (const status of value.statuses) {
                console.log('[meta-cloud/webhook] Status:', {
                    id: status.id,
                    status: status.status,
                    recipientId: status.recipient_id,
                })
            }
        }

        // Always return 200 to prevent Meta from retrying
        return NextResponse.json({
            received: true,
            messagesCount: value?.messages?.length ?? 0,
            statusesCount: value?.statuses?.length ?? 0,
        })
    } catch (error) {
        console.error('[meta-cloud/webhook] POST error:', error)
        // Always return 200 to prevent Meta from retrying
        return NextResponse.json({ received: true, error: 'Internal error' })
    }
}
