import { prisma } from '@/lib/prisma'

const GRAPH_API_URL = 'https://graph.facebook.com'
const API_VERSION = process.env.META_API_VERSION || 'v24.0'

interface SendTemplateParams {
    phoneId: string
    to: string
    templateName: string
    language?: string
    accessToken: string
}

interface GetTemplatesParams {
    wabaId: string
    accessToken: string
}

export class MetaCloudService {
    /**
     * Send a template message (e.g., hello_world)
     */
    static async sendTemplate({
        phoneId,
        to,
        templateName,
        language = 'en_US',
        accessToken
    }: SendTemplateParams) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${phoneId}/messages`

        const payload = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
                name: templateName,
                language: {
                    code: language,
                },
            },
        }

        console.log('[MetaCloudService] Sending template:', { url, payload })

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Send error:', data)
            throw new Error(data.error?.message || 'Failed to send WhatsApp message')
        }

        return data
    }

    /**
     * Fetch templates for a WABA
     */
    static async getTemplates({ wabaId, accessToken }: GetTemplatesParams) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/message_templates?limit=50`

        console.log('[MetaCloudService] Fetching templates:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Fetch templates error:', data)
            throw new Error(data.error?.message || 'Failed to fetch templates')
        }

        return data.data || []
    }

    /**
     * Fetch phone numbers for a WABA
     */
    static async listPhoneNumbers({ wabaId, accessToken }: { wabaId: string, accessToken: string }) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/phone_numbers`

        console.log('[MetaCloudService] Fetching phone numbers:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Fetch phone numbers error:', data)
            throw new Error(data.error?.message || 'Failed to fetch phone numbers')
        }

        return data.data || []
    }

    /**
     * Fetch business profile for a phone ID
     */
    static async getBusinessProfile({ phoneId, accessToken }: { phoneId: string, accessToken: string }) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${phoneId}/whatsapp_business_profile`

        console.log('[MetaCloudService] Fetching business profile:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Fetch business profile error:', data)
            throw new Error(data.error?.message || 'Failed to fetch business profile')
        }

        return data.data?.[0] || null
    }

    /**
     * Fetch WABA account info
     */
    static async getAccountInfo({ wabaId, accessToken }: { wabaId: string, accessToken: string }) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}`

        console.log('[MetaCloudService] Fetching account info:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Fetch account info error:', data)
            throw new Error(data.error?.message || 'Failed to fetch account info')
        }

        return data
    }

    /**
     * Helper to get config for an organization
     */
    static async getConfig(organizationId: string) {
        return prisma.whatsAppConfig.findUnique({
            where: { organizationId }
        })
    }
}
