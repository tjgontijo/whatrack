import { prisma } from '@/lib/db/prisma'
import { encryption } from '@/lib/utils/encryption'
import axios from 'axios'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[MetaAccessTokenService] ${name} environment variable is required`)
  return value
}

interface MetaTokenDebug {
  data: {
    app_id: string
    type: string
    application: string
    expires_at: number
    is_valid: boolean
    scopes: string[]
    user_id: string
  }
}

interface MetaUserInfo {
  id: string
  name: string
}

export class MetaAccessTokenService {
  /**
   * Exchange OAuth Code for Short-Lived User Access Token
   */
  async getShortLivedToken(code: string, redirectUri?: string): Promise<string> {
    const response = await axios.get(
      `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/oauth/access_token`,
      {
        params: {
          client_id: requireEnv('META_ADS_APP_ID'),
          client_secret: requireEnv('META_ADS_APP_SECRET'),
          redirect_uri:
            redirectUri ||
            process.env.META_OAUTH_REDIRECT_URI ||
            `${process.env.APP_URL}/api/v1/meta-ads/callback`,
          code,
        },
      }
    )

    return response.data.access_token
  }

  /**
   * Exchange Short-Lived Token for Long-Lived Token (60 days)
   */
  async getLongLivedToken(
    shortLivedToken: string
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const response = await axios.get(
      `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: requireEnv('META_ADS_APP_ID'),
          client_secret: requireEnv('META_ADS_APP_SECRET'),
          fb_exchange_token: shortLivedToken,
        },
      }
    )

    const accessToken = response.data.access_token
    const expiresIn = response.data.expires_in // Seconds

    // Some tokens don't have an expires_in (eternal), but user tokens usually have 60 days
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // Default 60 days

    return { accessToken, expiresAt }
  }

  /**
   * Get User Info (Name and ID) using the valid token
   */
  async getUserInfo(accessToken: string): Promise<MetaUserInfo> {
    const response = await axios.get(
      `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/me`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name',
        },
      }
    )

    return response.data
  }

  /**
   * Debug Token to verify scopes and validity
   */
  async debugToken(accessToken: string): Promise<MetaTokenDebug['data']> {
    const appId = requireEnv('META_ADS_APP_ID')
    const appSecret = requireEnv('META_ADS_APP_SECRET')
    const appToken = `${appId}|${appSecret}`
    const response = await axios.get(
      `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/debug_token`,
      {
        params: {
          input_token: accessToken,
          access_token: appToken,
        },
      }
    )

    return response.data.data
  }

  /**
   * Save or Update Meta Connection for an organization
   */
  async upsertConnection(
    organizationId: string,
    accessToken: string,
    projectId: string
  ) {
    const debug = await this.debugToken(accessToken)
    if (!debug.is_valid) throw new Error('Invalid Meta Access Token')

    const userInfo = await this.getUserInfo(accessToken)
    const { accessToken: longLivedToken, expiresAt } = await this.getLongLivedToken(accessToken)

    const encryptedToken = encryption.encrypt(longLivedToken)

    return await prisma.metaConnection.upsert({
      where: {
        organizationId_fbUserId: {
          organizationId,
          fbUserId: userInfo.id,
        },
      },
      update: {
        fbUserName: userInfo.name,
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        status: 'ACTIVE',
        projectId,
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        projectId,
        fbUserId: userInfo.id,
        fbUserName: userInfo.name,
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        status: 'ACTIVE',
      },
    })
  }

  /**
   * Get decrypted token for an organization/connection
   */
  async getDecryptedToken(connectionId: string): Promise<string> {
    const connection = await prisma.metaConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) throw new Error('Meta Connection not found')
    return encryption.decrypt(connection.accessToken)
  }
}

export const metaAccessTokenService = new MetaAccessTokenService()
