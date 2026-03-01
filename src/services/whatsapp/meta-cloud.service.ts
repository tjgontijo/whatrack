import { prisma } from '@/lib/db/prisma'
import { resolveAccessToken } from '@/lib/whatsapp/token-crypto'
import { logger } from '@/lib/utils/logger'

const GRAPH_API_URL = 'https://graph.facebook.com'
export const API_VERSION = process.env.META_API_VERSION

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
    const token = process.env.META_ACCESS_TOKEN
    if (!token)
      throw new Error('[MetaCloudService] META_ACCESS_TOKEN environment variable is required')
    return token
  }

  /**
   * Exchange a temporary authorization code for a long-lived access token
   * Meta API: POST /oauth/access_token
   */
  static async exchangeCodeForToken(code: string, redirectUri?: string) {
    const url = `${GRAPH_API_URL}/${API_VERSION}/oauth/access_token`

    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    const finalRedirectUri =
      redirectUri || `${process.env.APP_URL}/api/v1/whatsapp/onboarding/callback`

    logger.info({ context: { url, appId, redirectUri: finalRedirectUri, code: code.substring(0, 10) + '...' } }, '[MetaCloudService] Exchanging code for token')

    if (!appId)
      throw new Error('[MetaCloudService] NEXT_PUBLIC_META_APP_ID environment variable is required')
    const appSecret = process.env.META_APP_SECRET
    if (!appSecret)
      throw new Error('[MetaCloudService] META_APP_SECRET environment variable is required')

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: finalRedirectUri,
        code,
      }).toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Token exchange error')
      throw new Error(data.error?.message || 'Failed to exchange code for token')
    }

    logger.info({ context: { access_token: data.access_token ? 'OK' : 'MISSING', expires_in: data.expires_in } }, '[MetaCloudService] Token received')

    return data as { access_token: string; expires_in?: number }
  }

  /**
   * List WABAs shared with the app via Embedded Signup
   * Uses debug_token to extract WABA IDs from granular_scopes
   */
  static async listWabas(
    accessToken: string
  ): Promise<Array<{ wabaId: string; wabaName: string; businessId: string }>> {
    logger.info('[MetaCloudService] Fetching WABAs via debug_token...')

    try {
      const debugData = await this.debugToken(accessToken)
      logger.info({ context: debugData }, '[MetaCloudService] Debug token response')

      const granularScopes = debugData.granular_scopes || []
      const wabaIds: string[] = []

      for (const scope of granularScopes) {
        if (scope.scope === 'whatsapp_business_management' && scope.target_ids) {
          wabaIds.push(...scope.target_ids)
        }
      }

      logger.info({ context: { count: wabaIds.length, wabaIds } }, '[MetaCloudService] Found WABA IDs from granular_scopes')

      if (wabaIds.length > 0) {
        const allWabas: Array<{ wabaId: string; wabaName: string; businessId: string }> = []

        for (const wabaId of wabaIds) {
          try {
            const wabaInfo = await this.getAccountInfo({ wabaId, accessToken })
            allWabas.push({
              wabaId,
              wabaName: wabaInfo.name || 'WhatsApp Business',
              businessId: wabaInfo.owner_business_info?.id || 'unknown',
            })
          } catch (err) {
            logger.warn({ err, context: { wabaId } }, '[MetaCloudService] Failed to get info for WABA')
            allWabas.push({
              wabaId,
              wabaName: 'WhatsApp Business',
              businessId: 'unknown',
            })
          }
        }

        return allWabas
      }
    } catch (err) {
      logger.warn({ err }, '[MetaCloudService] debug_token failed, trying /me/businesses')
    }

    const url = `${GRAPH_API_URL}/${API_VERSION}/me/businesses?fields=id,name,client_whatsapp_business_accounts{id,name,currency,timezone_id}`

    logger.info('[MetaCloudService] Fallback: Fetching shared WABAs via /me/businesses...')

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] List WABAs error')
      throw new Error(data.error?.message || 'Failed to list WABAs')
    }

    const businesses = data.data || []
    const allWabas: Array<{ wabaId: string; wabaName: string; businessId: string }> = []

    for (const business of businesses) {
      const clientWabas = business.client_whatsapp_business_accounts?.data || []
      for (const waba of clientWabas) {
        allWabas.push({
          wabaId: waba.id,
          wabaName: waba.name || 'WhatsApp Business',
          businessId: business.id,
        })
      }
    }

    logger.info({ context: { wabaCount: allWabas.length, businessCount: businesses.length } }, '[MetaCloudService] Found WABAs')
    return allWabas
  }

  /**
   * Subscribe your app to a WABA's webhooks
   * Meta API: POST /{WABA_ID}/subscribed_apps
   */
  static async subscribeToWaba(wabaId: string, accessToken: string) {
    const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/subscribed_apps`

    logger.info({ context: { wabaId, url } }, '[MetaCloudService] Subscribing webhooks for WABA')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Webhook subscription error')
      throw new Error(data.error?.message || 'Falha ao assinar webhooks da WABA')
    }

    logger.info({ context: data }, '[MetaCloudService] Webhook subscription success')
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
    accessToken,
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

    logger.info({ context: { url, payload } }, '[MetaCloudService] Sending template')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Send error')
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

    logger.info({ context: { url } }, '[MetaCloudService] Fetching templates')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Fetch templates error')
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

    logger.info({ context: { wabaId, templateName: template.name, url } }, '[MetaCloudService] Creating template')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    })

    const data = await response.json()

    if (!response.ok) {
      const metaError = data.error?.message || 'Erro desconhecido na API da Meta'
      const errorDetails = data.error?.error_data?.details || ''
      const errorParam = data.error?.error_subcode ? `(Subcode: ${data.error.error_subcode})` : ''
      const fullError = `${metaError} ${errorParam}${errorDetails ? ` - ${errorDetails}` : ''}`

      logger.error({ err: data.error }, '[MetaCloudService] Create template error')
      throw new Error(fullError)
    }

    logger.info({ context: data }, '[MetaCloudService] Template created successfully')
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
  static async editTemplate({
    templateId,
    accessToken,
    components,
  }: {
    templateId: string
    accessToken?: string
    components: any[]
  }) {
    const token = accessToken || this.accessToken
    const url = `${GRAPH_API_URL}/${API_VERSION}/${templateId}`

    logger.info({ context: { templateId, url } }, '[MetaCloudService] Editing template')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ components }),
    })

    const data = await response.json()

    if (!response.ok) {
      const metaError = data.error?.message || 'Erro desconhecido na API da Meta'
      const errorCode = data.error?.code
      const errorSubcode = data.error?.error_subcode

      let userMessage = metaError
      if (errorCode === 100 && errorSubcode === 33) {
        userMessage =
          'Limite de edições atingido. Templates aprovados podem ser editados no máximo 10 vezes em 30 dias (1 vez a cada 24h).'
      } else if (errorCode === 100) {
        userMessage = `Erro ao editar template: ${metaError}`
      }

      logger.error({ err: data.error }, '[MetaCloudService] Edit template error')
      throw new Error(userMessage)
    }

    logger.info({ context: data }, '[MetaCloudService] Template edited successfully')
    return data
  }

  /**
   * Delete a message template by name
   */
  static async deleteTemplate({
    wabaId,
    accessToken,
    name,
  }: {
    wabaId: string
    accessToken?: string
    name: string
  }) {
    const token = accessToken || this.accessToken
    const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/message_templates?name=${name}`

    logger.info({ context: { url, name } }, '[MetaCloudService] Deleting template')

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Delete template error')
      throw new Error(data.error?.message || 'Failed to delete template')
    }

    return data
  }

  /**
   * Fetch phone numbers for a WABA
   */
  static async listPhoneNumbers({ wabaId, accessToken }: { wabaId: string; accessToken?: string }) {
    const token = accessToken || this.accessToken
    const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/phone_numbers?fields=display_phone_number,verified_name,status,quality_rating,throughput`

    logger.info({ context: { url } }, '[MetaCloudService] Fetching phone numbers')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Fetch phone numbers error')
      throw new Error(data.error?.message || 'Failed to fetch phone numbers')
    }

    return data.data || []
  }

  /**
   * Fetch business profile for a phone ID
   */
  static async getBusinessProfile({
    phoneId,
    accessToken,
  }: {
    phoneId: string
    accessToken?: string
  }) {
    const token = accessToken || this.accessToken
    const url = `${GRAPH_API_URL}/${API_VERSION}/${phoneId}/whatsapp_business_profile`

    logger.info({ context: { url } }, '[MetaCloudService] Fetching business profile')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Fetch business profile error')
      throw new Error(data.error?.message || 'Failed to fetch business profile')
    }

    return data.data?.[0] || null
  }

  /**
   * Fetch WABA account info
   */
  static async getAccountInfo({ wabaId, accessToken }: { wabaId: string; accessToken?: string }) {
    const token = accessToken || this.accessToken
    const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}`

    logger.info({ context: { url } }, '[MetaCloudService] Fetching account info')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Fetch account info error')
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
    after,
  }: {
    phoneId: string
    accessToken?: string
    limit?: number
    after?: string
  }) {
    const token = accessToken || this.accessToken
    let url = `${GRAPH_API_URL}/${API_VERSION}/${phoneId}/message_history?limit=${limit}&fields=id,message_id,events{delivery_status,timestamp,application,webhook_uri,error_description}`

    if (after) {
      url += `&after=${after}`
    }

    logger.info({ context: { url } }, '[MetaCloudService] Fetching message history')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Fetch message history error')
      throw new Error(data.error?.message || 'Failed to fetch message history')
    }

    return data
  }

  /**
   * Deregister a phone number from the Cloud API
   * Meta API: POST /{PHONE_ID}/deregister
   */
  static async deregisterPhone({
    phoneId,
    accessToken,
  }: {
    phoneId: string
    accessToken?: string
  }) {
    const token = accessToken || this.accessToken
    const url = `${GRAPH_API_URL}/${API_VERSION}/${phoneId}/deregister`

    logger.info({ context: { url } }, '[MetaCloudService] Deregistering phone')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Deregister error')
      throw new Error(data.error?.message || 'Failed to deregister phone')
    }

    return data
  }

  /**
   * Helper to get config for an organization.
   * Reads from the database only. Use the seed to populate development data.
   */
  static async getConfig(organizationId: string) {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    })

    return config
  }

  static async getAllConfigs(organizationId: string) {
    return prisma.whatsAppConfig.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Resolves the access token for a config, handling decryption if needed.
   * Use this instead of directly reading config.accessToken.
   */
  static getAccessTokenForConfig(config: { accessToken: string | null }): string {
    return resolveAccessToken(config.accessToken)
  }

  /**
   * Debug/verify an access token via Meta's debug_token endpoint.
   * Returns token metadata including validity, expiration, and granular_scopes.
   *
   * Meta API: GET /debug_token?input_token={token}
   * Requires an app token (app_id|app_secret) or a valid user token.
   */
  static async debugToken(inputToken: string): Promise<{
    is_valid: boolean
    expires_at: number
    scopes: string[]
    granular_scopes?: Array<{ scope: string; target_ids?: string[] }>
    app_id: string
    error?: { message: string; code: number }
  }> {
    const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    const appToken = `${appId}|${appSecret}`

    const url = `${GRAPH_API_URL}/${API_VERSION}/debug_token?input_token=${encodeURIComponent(inputToken)}`

    logger.info('[MetaCloudService] Debugging token...')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${appToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Debug token error')
      throw new Error(data.error?.message || 'Failed to debug token')
    }

    return data.data
  }

  /**
   * Unsubscribe (remove) the app from a WABA's webhooks.
   * Used when disconnecting a WABA.
   *
   * Meta API: DELETE /{WABA_ID}/subscribed_apps
   */
  static async unsubscribeFromWaba(wabaId: string, accessToken: string) {
    const url = `${GRAPH_API_URL}/${API_VERSION}/${wabaId}/subscribed_apps`

    logger.info({ context: { wabaId } }, '[MetaCloudService] Unsubscribing webhooks for WABA')

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error({ err: data }, '[MetaCloudService] Unsubscribe error')
      throw new Error(data.error?.message || 'Failed to unsubscribe from WABA')
    }

    logger.info({ context: { wabaId } }, '[MetaCloudService] Successfully unsubscribed from WABA')
    return data
  }
}
