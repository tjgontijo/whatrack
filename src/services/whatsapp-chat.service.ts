import { prisma } from '@/lib/prisma'

interface MessagePayload {
    from: string
    id: string
    timestamp: string
    type: string
    text?: { body: string }
    image?: { id: string; caption?: string; mime_type: string; sha256: string }
    video?: { id: string; caption?: string; mime_type: string; sha256: string }
    audio?: { id: string; mime_type: string; sha256: string }
    document?: { id: string; caption?: string; filename: string; mime_type: string; sha256: string }
    sticker?: { id: string; mime_type: string; sha256: string }
    location?: { latitude: number; longitude: number; name?: string; address?: string }
    button?: { payload: string; text: string }
    interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string; description?: string } }
    reaction?: { message_id: string; emoji: string }
    errors?: any
    [key: string]: any
}

interface ContactProfile {
    name?: string
}

export class WhatsAppChatService {
    /**
     * Process an incoming message from the webhook
     */
    static async processIncomingMessage(
        instanceId: string,
        messageData: MessagePayload,
        contactProfile?: ContactProfile
    ) {
        try {
            const { from, id: wamid, timestamp, type } = messageData

            // Check if message already exists (idempotency)
            // Ideally check this first to save DB calls if redundant webhook delivery
            const existingMessage = await prisma.message.findUnique({
                where: { wamid }
            })

            if (existingMessage) {
                return existingMessage
            }

            // 0. Find Organization ID from Instance
            const instance = await prisma.whatsAppConfig.findUnique({
                where: { id: instanceId },
                select: { organizationId: true }
            })

            if (!instance) {
                throw new Error(`Instance ${instanceId} not found`)
            }

            const organizationId = instance.organizationId

            // 1. Find or Create Lead
            // We search by phone OR waId within the organization
            const lead = await prisma.lead.upsert({
                where: {
                    organizationId_phone: {
                        organizationId,
                        phone: from
                    }
                },
                update: {
                    waId: from,
                    pushName: contactProfile?.name || undefined,
                    lastMessageAt: new Date(parseInt(timestamp) * 1000),
                },
                create: {
                    organizationId,
                    phone: from,
                    waId: from,
                    pushName: contactProfile?.name,
                    lastMessageAt: new Date(parseInt(timestamp) * 1000),
                }
            })

            // 2. Extract content based on type
            let body: string | null = null
            let mediaUrl: string | null = null

            switch (type) {
                case 'text':
                    body = messageData.text?.body || ''
                    break
                case 'image':
                    body = messageData.image?.caption || 'Image'
                    mediaUrl = `meta_id:${messageData.image?.id}` // Store Meta ID for later download
                    break
                case 'video':
                    body = messageData.video?.caption || 'Video'
                    mediaUrl = `meta_id:${messageData.video?.id}`
                    break
                case 'audio':
                case 'voice':
                    body = 'Audio Message'
                    mediaUrl = `meta_id:${messageData.audio?.id || messageData['voice']?.id}`
                    break
                case 'document':
                    body = messageData.document?.caption || messageData.document?.filename || 'Document'
                    mediaUrl = `meta_id:${messageData.document?.id}`
                    break
                case 'sticker':
                    body = 'Sticker'
                    mediaUrl = `meta_id:${messageData.sticker?.id}`
                    break
                case 'location':
                    body = `Location: ${messageData.location?.name || ''} (${messageData.location?.latitude}, ${messageData.location?.longitude})`
                    break
                case 'button':
                    body = messageData.button?.text || 'Button Response'
                    break
                case 'interactive':
                    const interactive = messageData.interactive
                    if (interactive?.type === 'button_reply') {
                        body = interactive.button_reply?.title || 'Button Reply'
                    } else if (interactive?.type === 'list_reply') {
                        body = interactive.list_reply?.title || 'List Reply'
                    } else {
                        body = 'Interactive Message'
                    }
                    break
                case 'reaction':
                    body = `Reacted ${messageData.reaction?.emoji} to message ${messageData.reaction?.message_id}`
                    break
                case 'unknown':
                default:
                    body = `Unsupported message type: ${type}`
            }

            // 3. Create Message
            const message = await prisma.message.create({
                data: {
                    wamid,
                    leadId: lead.id,
                    instanceId,
                    direction: 'INBOUND',
                    type,
                    body: body || '',
                    mediaUrl,
                    status: 'active',
                    timestamp: new Date(parseInt(timestamp) * 1000),
                }
            })

            return message

        } catch (error) {
            console.error('[WhatsAppChatService] Error processing incoming message:', error)
            // We log but maybe don't rethrow to avoid crashing the whole webhook if one message fails?
            // But if we throw, maybe we can retry?
            // Let's rethrow 
            throw error
        }
    }

    /**
     * Process an outgoing message echo (sent from another device/app)
     */
    static async processMessageEcho(
        instanceId: string,
        messageData: MessagePayload,
    ) {
        try {
            const { to, id: wamid, timestamp, type } = messageData
            const customerPhone = to // In echoes, 'to' is the customer

            // Check if message already exists
            const existingMessage = await prisma.message.findUnique({
                where: { wamid }
            })

            if (existingMessage) return existingMessage

            // 0. Find Organization
            const instance = await prisma.whatsAppConfig.findUnique({
                where: { id: instanceId },
                select: { organizationId: true }
            })

            if (!instance) throw new Error(`Instance ${instanceId} not found`)

            // 1. Find or Create Lead (Recipient)
            const lead = await prisma.lead.upsert({
                where: {
                    organizationId_phone: {
                        organizationId: instance.organizationId,
                        phone: customerPhone
                    }
                },
                update: {
                    lastMessageAt: new Date(parseInt(timestamp) * 1000),
                },
                create: {
                    organizationId: instance.organizationId,
                    phone: customerPhone,
                    waId: customerPhone,
                    lastMessageAt: new Date(parseInt(timestamp) * 1000),
                }
            })

            // 2. Extract content (simplified call to shared logic or duplicate for now)
            let body: string | null = null
            if (type === 'text') body = messageData.text?.body || ''
            else body = `Sent ${type} message`

            // 3. Create Message (OUTBOUND)
            return await prisma.message.create({
                data: {
                    wamid,
                    leadId: lead.id,
                    instanceId,
                    direction: 'OUTBOUND',
                    type,
                    body: body || '',
                    status: 'active',
                    timestamp: new Date(parseInt(timestamp) * 1000),
                }
            })
        } catch (error) {
            console.error('[WhatsAppChatService] Error processing message echo:', error)
            throw error
        }
    }

    /**
     * Process message status update (sent, delivered, read)
     */
    static async processStatusUpdate(
        instanceId: string,
        statusData: any
    ) {
        try {
            const { id: wamid, status, timestamp, recipient_id } = statusData

            // 1. Find the message
            const message = await prisma.message.findUnique({
                where: { wamid }
            })

            if (!message) {
                return null
            }

            // 2. Update status
            const statusPriority: Record<string, number> = {
                'sent': 1,
                'delivered': 2,
                'read': 3,
                'failed': 4
            }

            const currentPriority = statusPriority[message.status] || 0
            const newPriority = statusPriority[status] || 0

            if (newPriority >= currentPriority) {
                await prisma.message.update({
                    where: { id: message.id },
                    data: {
                        status: status
                    }
                })
            }

        } catch (error) {
            console.error('[WhatsAppChatService] Error processing status update:', error)
        }
    }
}
