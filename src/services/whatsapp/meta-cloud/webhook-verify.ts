import { getMetaCloudConfig } from './config'

type WebhookVerifyParams = {
  mode: string | null
  token: string | null
  challenge: string | null
}

type WebhookVerifyResult = {
  success: boolean
  challenge?: string
  error?: string
}

/**
 * Verifica requisicao de verificacao do webhook da Meta
 *
 * Endpoint: GET /api/v1/whatsapp/meta-cloud/webhook
 * A Meta envia: hub.mode, hub.verify_token, hub.challenge
 */
export function verifyMetaWebhook({
  mode,
  token,
  challenge,
}: WebhookVerifyParams): WebhookVerifyResult {
  const { webhookVerifyToken } = getMetaCloudConfig()

  if (mode === 'subscribe' && token === webhookVerifyToken) {
    return {
      success: true,
      challenge: challenge || '',
    }
  }

  return {
    success: false,
    error: 'Invalid verify token or mode',
  }
}
