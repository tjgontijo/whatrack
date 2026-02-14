import { prisma } from '@/lib/prisma'

const GRAPH_API_URL = 'https://graph.facebook.com'
export const API_VERSION = process.env.META_API_VERSION || 'v24.0'

interface SendTemplateParams {
    phoneId: string
    to: string
    templateName: string
    language?: string
    accessToken?: string
}

interface GetTemplatesParams {
    wabaId: string
    accessToken?: string
}

interface CreateTemplateParams {
    wabaId: string
    accessToken?: string
    template: {
        name: string
        category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
        language: string
        components: any[]
    }
}

export class MetaCloudService {
    /**
     * Fallback global (ENV) — usado quando não temos o contexto de organização.
     */
    static get accessToken() {
        return process.env.META_ACCESS_TOKEN || ''
    }

    /**
     * Exchange a temporary authorization code for a long-lived access token
     * Meta API: POST /oauth/access_token
     */
    static async exchangeCodeForToken(code: string) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/oauth/access_token`

        // Para Embedded Signup v3 com Hosted ES, o redirect_uri precisa bater com o enviado no diálogo
        // Se o diálogo usou business.facebook.com, precisamos passar exatamente igual.
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        // O redirect_uri deve ser EXATAMENTE o mesmo enviado pelo frontend
        // Como o app roda em whatrack.com, usamos este padrão.
        const redirectUri = 'https://whatrack.com/dashboard/settings/whatsapp/';

        const payload: any = {
            client_id: appId,
            client_secret: process.env.META_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code
        }

        console.log('[MetaCloudService] Exchanging code for token:', { url, appId })

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Token exchange error:', data)
            throw new Error(data.error?.message || 'Failed to exchange authorization code')
        }

        return data as {
            access_token: string
            token_type: string
            expires_in?: number
        }
    }

    /**
     * Subscribe your app to a WABA's webhooks
     * Meta API: POST /{WABA_ID}/subscribed_apps
     */
    static async subscribeToWaba(wabaId: string, accessToken: string) {
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/subscribed_apps`

        console.log('[MetaCloudService] Subscribing to WABA webhooks:', { url })

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Subscription error:', data)
            throw new Error(data.error?.message || 'Failed to subscribe to WABA webhooks')
        }

        return data
    }



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
        const token = accessToken || this.accessToken
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
                'Authorization': `Bearer ${token}`,
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
        const token = accessToken || this.accessToken
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/message_templates?limit=50`

        console.log('[MetaCloudService] Fetching templates:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
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
        const token = accessToken || this.accessToken
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
                'Authorization': `Bearer ${token}`,
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
            const errorParam = data.error?.error_subcode ? `(Subcode: ${data.error.error_subcode})` : ''
            const fullError = `${metaError} ${errorParam}${errorDetails ? ` - ${errorDetails}` : ''}`

            console.error('[MetaCloudService] ERRO DETALHADO:', JSON.stringify(data.error, null, 2))
            throw new Error(fullError)
        }

        console.log('[MetaCloudService] TEMPLATE CRIADO COM SUCESSO:', data)
        return data
    }

    /**
     * Edit an existing message template by its ID.
     * Meta API requires: POST /{API_VERSION}/{TEMPLATE_ID}
     * Rules:
     * - Only APPROVED, REJECTED, or PAUSED templates can be edited
     * - APPROVED templates: max 10 edits in 30 days, 1 per 24h
     * - Name, category, and language CANNOT be changed
     */
    static async editTemplate({ templateId, accessToken, components }: {
        templateId: string
        accessToken?: string
        components: any[]
    }) {
        const token = accessToken || this.accessToken
        const url = `${GRAPH_API_URL}/${API_VERSION}/${templateId}`

        console.log('[MetaCloudService] INICIANDO EDIÇÃO DE TEMPLATE:', {
            templateId,
            url,
        })
        console.log('[MetaCloudService] COMPONENTES ENVIADOS:', JSON.stringify(components, null, 2))

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ components }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] ERRO AO EDITAR TEMPLATE:', JSON.stringify(data, null, 2))

            const metaError = data.error?.message || 'Erro desconhecido na API da Meta'
            const errorCode = data.error?.code
            const errorSubcode = data.error?.error_subcode

            // Specific error messages for common edit failures
            let userMessage = metaError
            if (errorCode === 100 && errorSubcode === 33) {
                userMessage = 'Limite de edições atingido. Templates aprovados podem ser editados no máximo 10 vezes em 30 dias (1 vez a cada 24h).'
            } else if (errorCode === 100) {
                userMessage = `Erro ao editar template: ${metaError}`
            }

            throw new Error(userMessage)
        }

        console.log('[MetaCloudService] TEMPLATE EDITADO COM SUCESSO:', data)
        return data
    }

    /**
     * Delete a message template by name
     */
    static async deleteTemplate({ wabaId, accessToken, name }: { wabaId: string, accessToken?: string, name: string }) {
        const token = accessToken || this.accessToken
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/message_templates?name=${name}`

        console.log('[MetaCloudService] Deleting template:', { url, name })

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
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
    static async listPhoneNumbers({ wabaId, accessToken }: { wabaId: string, accessToken?: string }) {
        const token = accessToken || this.accessToken
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/phone_numbers?fields=display_phone_number,verified_name,status,quality_rating,throughput`

        console.log('[MetaCloudService] DEBUG - AppID Enviado:', process.env.META_APP_ID)
        console.log('[MetaCloudService] DEBUG - Token Usado (10 chars):', token.substring(0, 10) + '...')
        console.log('[MetaCloudService] Fetching phone numbers:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
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
    static async getBusinessProfile({ phoneId, accessToken }: { phoneId: string, accessToken?: string }) {
        const token = accessToken || this.accessToken
        const url = `${GRAPH_API_URL}/${API_VERSION}/${phoneId}/whatsapp_business_profile`

        console.log('[MetaCloudService] Fetching business profile:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
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
    static async getAccountInfo({ wabaId, accessToken }: { wabaId: string, accessToken?: string }) {
        const token = accessToken || this.accessToken
        const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}`

        console.log('[MetaCloudService] Fetching account info:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
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
     * Fetch message history for a phone ID
     * Meta API: GET /{PHONE_ID}/message_history
     */
    static async getMessageHistory({
        phoneId,
        accessToken,
        limit = 50,
        after
    }: {
        phoneId: string,
        accessToken?: string,
        limit?: number,
        after?: string
    }) {
        const token = accessToken || this.accessToken
        let url = `${GRAPH_API_URL}/${API_VERSION}/${phoneId}/message_history?limit=${limit}&fields=id,message_id,events{delivery_status,timestamp,application,webhook_uri,error_description}`

        if (after) {
            url += `&after=${after}`
        }

        console.log('[MetaCloudService] Fetching message history:', { url })

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Fetch message history error:', data)
            throw new Error(data.error?.message || 'Failed to fetch message history')
        }

        return data
    }

    /**
     * Deregister a phone number from the Cloud API
     * Meta API: POST /{PHONE_ID}/deregister
     */
    static async deregisterPhone({ phoneId, accessToken }: { phoneId: string, accessToken?: string }) {
        const token = accessToken || this.accessToken
        const url = `${GRAPH_API_URL}/${API_VERSION}/${phoneId}/deregister`

        console.log('[MetaCloudService] Deregistering phone:', { url })

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[MetaCloudService] Deregister error:', data)
            throw new Error(data.error?.message || 'Failed to deregister phone')
        }

        return data
    }

    /**
     * Helper to get config for an organization.
     * Reads from the database only. Use the seed to populate development data.
     */
    static async getConfig(organizationId: string) {
        // Retorna a config mais recente por padrão (compatibilidade)
        const config = await prisma.whatsAppConfig.findFirst({
            where: { organizationId },
            orderBy: { updatedAt: 'desc' }
        })

        return config
    }

    static async getAllConfigs(organizationId: string) {
        return prisma.whatsAppConfig.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' }
        })
    }
}
