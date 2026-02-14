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

            // 1. Find or Create Contact
            // Using upsert with update allows updating lastMessageAt and profile info
            const contact = await prisma.contact.upsert({
                where: {
                    instanceId_waId: {
                        instanceId,
                        waId: from
                    }
                },
                update: {
                    lastMessageAt: new Date(parseInt(timestamp) * 1000),
                    pushName: contactProfile?.name || undefined, // Update name if provided
                },
                create: {
                    instanceId,
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
                case 'voice': // voice messages are usually type 'audio' with 'voice': true? or just type 'audio'. Meta documentation says type 'audio'. Some payloads say 'voice'.
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
                    // Store reaction as a separate message type or just body description?
                    // For simple chat history, maybe create a system message?
                    // Or ideally update the reacted message. 
                    // But we want a linear history for now. Let's store as a message.
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
                    contactId: contact.id,
                    instanceId,
                    direction: 'INBOUND',
                    type,
                    body: body || '',
                    mediaUrl,
                    status: 'active', // or 'delivered' to us
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
