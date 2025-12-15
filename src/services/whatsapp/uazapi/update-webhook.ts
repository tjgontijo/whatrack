import { prisma } from '@/lib/prisma'
import { getUazapiConfig } from './config'
import { createAppBaseUrl } from '@/lib/tracking/url'

type UpdateWebhookParams = {
    instanceId: string
    organizationId: string
    action?: 'add' | 'update' | 'delete'
    id?: string
    enabled?: boolean
    events?: string[]
    excludeMessages?: string[]
    addUrlEvents?: boolean
    addUrlTypesMessages?: boolean
}

/**
 * Configura webhook da instância no provedor UAZAPI (usa token da instância)
 */
export async function updateWebhook({
    instanceId,
    organizationId,
    action,
    id,
    enabled,
    events,
    excludeMessages,
    addUrlEvents,
    addUrlTypesMessages,
}: UpdateWebhookParams) {
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

    // Upsert de webhook local (um por instância)
    const webhook = await prisma.instanceWebhook.upsert({
        where: {
            organizationId_instanceId_webhook: {
                organizationId,
                instanceId,
            },
        },
        update: {},
        create: {
            organizationId,
            instanceId,
            url: '', // preenchido logo abaixo
        },
    })

    const { baseUrl } = getUazapiConfig()
    const appBaseUrl = createAppBaseUrl()
    const url = `${appBaseUrl}/api/v1/whatsapp/webhook/${webhook.id}`

    const payload: Record<string, unknown> = {}
    payload.url = url
    payload.instanceId = instanceId

    if (typeof enabled === 'boolean') payload.enabled = enabled
    if (Array.isArray(events)) payload.events = events
    if (Array.isArray(excludeMessages)) payload.excludeMessages = excludeMessages
    if (typeof addUrlEvents === 'boolean') payload.addUrlEvents = addUrlEvents
    if (typeof addUrlTypesMessages === 'boolean') payload.addUrlTypesMessages = addUrlTypesMessages
    if (action) payload.action = action
    if (id) payload.id = id

    const response = await fetch(`${baseUrl}/webhook`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            token: link.token,
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Falha ao configurar webhook: ${response.status} ${text}`)
    }

    // Atualiza URL (e provider id se vier no response)
    const responseBody = await response.json().catch(() => null)
    const providerWebhookId =
        typeof responseBody?.id === 'string'
            ? responseBody.id
            : typeof responseBody?.webhookId === 'string'
                ? responseBody.webhookId
                : undefined

    await prisma.instanceWebhook.update({
        where: {
            organizationId_instanceId_webhook: {
                organizationId,
                instanceId,
            },
        },
        data: {
            url,
            providerWebhookId,
        },
    })
}
