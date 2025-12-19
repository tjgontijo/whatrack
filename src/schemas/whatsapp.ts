import { z } from 'zod'

/**
 * Schema para criar uma instância WhatsApp
 * Baseado no padrão UAZAPI documentado em uazapi.md
 */
export const createInstanceSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
})

/**
 * Schema para conectar uma instância
 * Se phone for fornecido, gera pair code. Caso contrário, gera QR code.
 */
export const connectInstanceSchema = z.object({
    phone: z.string().optional(),
})

/**
 * Schema para configurar webhook de uma instância
 */
export const updateWebhookSchema = z.object({
    action: z.enum(['add', 'update', 'delete']).optional(),
    id: z.string().optional(),
    url: z.string().url('URL inválida').optional(),
    enabled: z.boolean().optional(),
    events: z.array(z.string()).optional(),
    excludeMessages: z.array(z.string()).optional(),
    addUrlEvents: z.boolean().optional(),
    addUrlTypesMessages: z.boolean().optional(),
})

/**
 * Schema para enviar mensagem
 */
export const sendMessageSchema = z.object({
    instanceId: z.string().min(1, 'ID da instância é obrigatório'),
    to: z.string().min(1, 'Destinatário é obrigatório'),
    type: z.enum(['text', 'image', 'audio', 'video', 'document']),
    text: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    caption: z.string().optional(),
})

/**
 * Schema para webhook recebido (eventos da UAZAPI)
 */
export const webhookEventSchema = z.object({
    event: z.enum(['message_received', 'message_status', 'connection_update']),
    instanceId: z.string(),
    message: z
        .object({
            id: z.string(),
            from: z.string(),
            to: z.string(),
            type: z.string(),
            text: z.string().optional(),
            mediaUrl: z.string().optional(),
            timestamp: z.string(),
        })
        .optional(),
    status: z
        .object({
            messageId: z.string(),
            status: z.string(),
            timestamp: z.string(),
        })
        .optional(),
    connection: z
        .object({
            status: z.string(),
            timestamp: z.string(),
        })
        .optional(),
})

/**
 * Schema para instâncias do WhatsApp
 */
export const whatsappInstanceSchema = z.object({
    id: z.string(),
    instanceId: z.string().optional(),
    label: z.string(),
    phone: z.string().nullable().optional(),
    status: z.string(),
    connected: z.boolean().optional(),
    loggedIn: z.boolean().optional(),
    qrcode: z.string().nullable().optional(),
    paircode: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
})

export const whatsappInstancesResponseSchema = z.object({
    items: z.array(whatsappInstanceSchema),
})

// Types exportados
export type CreateInstanceInput = z.infer<typeof createInstanceSchema>
export type ConnectInstanceInput = z.infer<typeof connectInstanceSchema>
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type WebhookEventInput = z.infer<typeof webhookEventSchema>
export type WhatsappInstance = z.infer<typeof whatsappInstanceSchema>
export type WhatsappInstancesResponse = z.infer<typeof whatsappInstancesResponseSchema>
