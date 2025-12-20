import { prisma } from '@/lib/prisma'
import { getUazapiConfig } from './config'

type SendMessageParams = {
    instanceId: string
    organizationId: string
    to: string
    type: 'text' | 'image' | 'audio' | 'video' | 'document'
    text?: string
    mediaUrl?: string
    caption?: string
    // Campos opcionais para preview de link (apenas para texto)
    linkPreview?: boolean
    linkPreviewTitle?: string
    linkPreviewDescription?: string
    linkPreviewImage?: string
    linkPreviewLarge?: boolean
}

/**
 * Envia mensagem através de uma instância WhatsApp
 * 
 * Conforme padrão documentado em uazapi.md:
 * - Endpoints: /send/text, /send/media, etc
 * - Header: token (token da instância)
 * - Resposta: { messageId, status, timestamp }
 */
export async function sendWhatsappMessage({
    instanceId,
    organizationId,
    to,
    type,
    text,
    mediaUrl,
    caption,
    linkPreview,
    linkPreviewTitle,
    linkPreviewDescription,
    linkPreviewImage,
    linkPreviewLarge,
}: SendMessageParams) {
    const link = await prisma.whatsappInstance.findUnique({
        where: {
            organizationId_instanceId: {
                organizationId,
                instanceId,
            },
        },
    })

    if (!link) {
        throw new Error('Instância não vinculada à organização')
    }

    if (!link.token) {
        throw new Error('Token da instância não encontrado')
    }

    const { baseUrl } = getUazapiConfig()

    // 2. Determinar endpoint e payload baseado no tipo
    let endpoint: string
    let payload: Record<string, unknown>

    switch (type) {
        case 'text':
            endpoint = '/send/text'
            payload = {
                to,
                text: text || '',
            }
            if (typeof linkPreview === 'boolean') payload.linkPreview = linkPreview
            if (linkPreviewTitle) payload.linkPreviewTitle = linkPreviewTitle
            if (linkPreviewDescription) payload.linkPreviewDescription = linkPreviewDescription
            if (linkPreviewImage) payload.linkPreviewImage = linkPreviewImage
            if (typeof linkPreviewLarge === 'boolean') payload.linkPreviewLarge = linkPreviewLarge
            break

        case 'image':
        case 'audio':
        case 'video':
        case 'document':
            endpoint = '/send/media'
            payload = {
                to,
                mediaUrl: mediaUrl || '',
                caption: caption || undefined,
            }
            break

        default:
            throw new Error(`Tipo de mensagem não suportado: ${type}`)
    }

    // 3. Enviar mensagem
    const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            token: link.token,
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('[sendWhatsappMessage] UAZAPI error', {
            status: response.status,
            body: errorText,
        })
        throw new Error(`Falha ao enviar mensagem: ${response.status}`)
    }

    const data = await response.json()

    // 4. Retornar resposta padronizada
    return {
        messageId: data.messageId || data.id || data.key?.id,
        instanceId,
        to,
        type,
        status: data.status || 'sent',
        timestamp: data.timestamp || new Date().toISOString(),
    }
}
