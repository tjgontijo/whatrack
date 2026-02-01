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

interface CreateTemplateParams {
    wabaId: string
    accessToken: string
    template: {
        name: string
        category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
        language: string
        components: any[]
    }
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
     * Create a new message template
     */
    static async createTemplate({ wabaId, accessToken, template }: CreateTemplateParams) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/message_templates`

        console.log('[MetaCloudService] INICIANDO CRIAÇÃO DE TEMPLATE:', {
            wabaId,
            templateName: template.name,
            url
        })
        console.log('[MetaCloudService] PAYLOAD ENVIADO PARA META:', JSON.stringify(template, null, 2))

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(template),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] ERRO NA RESPOSTA DA META:', JSON.stringify(data, null, 2))

            // Tratamento detalhado de erro da Meta
            const metaError = data.error?.message || 'Erro desconhecido na API da Meta'
            const errorDetails = data.error?.error_data?.details || ''
            const fullError = `${metaError}${errorDetails ? ` - ${errorDetails}` : ''}`

            throw new Error(fullError)
        }

        console.log('[MetaCloudService] TEMPLATE CRIADO COM SUCESSO:', data)
        return data
    }

    /**
     * Delete a message template by name
     */
    static async deleteTemplate({ wabaId, accessToken, name }: { wabaId: string, accessToken: string, name: string }) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/message_templates?name=${name}`

        console.log('[MetaCloudService] Deleting template:', { url, name })

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Delete template error:', data)
            throw new Error(data.error?.message || 'Failed to delete template')
        }

        return data
    }

    /**
     * Fetch phone numbers for a WABA
     */
    static async listPhoneNumbers({ wabaId, accessToken }: { wabaId: string, accessToken: string }) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/phone_numbers?fields=display_phone_number,verified_name,status,quality_rating,throughput`

        console.log('[MetaCloudService] DEBUG - AppID Enviado:', process.env.META_APP_ID)
        console.log('[MetaCloudService] DEBUG - Token Usado (10 chars):', accessToken.substring(0, 10) + '...')
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
     * Helper to get config for an organization.
     * Reads from the database only. Use the seed to populate development data.
     */
    static async getConfig(organizationId: string) {
        const config = await prisma.whatsAppConfig.findUnique({
            where: { organizationId }
        })

        return config
    }
}
