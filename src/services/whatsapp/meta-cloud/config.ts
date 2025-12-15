export type MetaCloudConfig = {
  appId: string
  appSecret: string
  webhookVerifyToken: string
  apiVersion: string
  graphApiUrl: string
}

/**
 * Retorna configuracao do Meta Cloud API
 * Essas variaveis sao do App (Whatrack como Tech Provider)
 */
export function getMetaCloudConfig(): MetaCloudConfig {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const webhookVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN
  const apiVersion = process.env.META_API_VERSION || 'v21.0'

  if (!appId) {
    throw new Error('META_APP_ID is not configured')
  }

  if (!appSecret) {
    throw new Error('META_APP_SECRET is not configured')
  }

  if (!webhookVerifyToken) {
    throw new Error('META_WEBHOOK_VERIFY_TOKEN is not configured')
  }

  return {
    appId,
    appSecret,
    webhookVerifyToken,
    apiVersion,
    graphApiUrl: `https://graph.facebook.com/${apiVersion}`,
  }
}
