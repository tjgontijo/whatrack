import { prisma } from '@/lib/db/prisma'
import { metaAccessTokenService } from './access-token.service'
import axios from 'axios'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[AdAccountService] ${name} environment variable is required`)
  return value
}

interface MetaAdAccountResponse {
  id: string
  name: string
  account_status: number
}

export class MetaAdAccountService {
  /**
   * Fetch Ad Accounts from Meta API and sync with local DB
   */
  async syncAdAccounts(connectionId: string) {
    const connection = await prisma.metaConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) throw new Error('Meta Connection not found')

    const token = await metaAccessTokenService.getDecryptedToken(connectionId)

    // Fetch accounts available to this user
    const response = await axios.get(
      `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/me/adaccounts`,
      {
        params: {
          access_token: token,
          fields: 'id,name,account_status',
          limit: 100,
        },
      }
    )

    const accounts: MetaAdAccountResponse[] = response.data.data

    // Batch upsert accounts
    for (const acc of accounts) {
      await prisma.metaAdAccount.upsert({
        where: {
          organizationId_adAccountId: {
            organizationId: connection.organizationId,
            adAccountId: acc.id,
          },
        },
        update: {
          adAccountName: acc.name,
          connectionId: connection.id,
        },
        create: {
          organizationId: connection.organizationId,
          connectionId: connection.id,
          adAccountId: acc.id,
          adAccountName: acc.name,
          isActive: false, // Default is inactive
        },
      })
    }

    return await prisma.metaAdAccount.findMany({
      where: { connectionId },
    })
  }

  /**
   * Toggle Ad Account Tracking
   */
  async toggleAccount(accountId: string, isActive: boolean) {
    return await prisma.metaAdAccount.update({
      where: { id: accountId },
      data: { isActive },
    })
  }

  /**
   * Get active accounts for an organization
   */
  async getActiveAccounts(organizationId: string) {
    return await prisma.metaAdAccount.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        connection: true,
      },
    })
  }
}

export const metaAdAccountService = new MetaAdAccountService()
