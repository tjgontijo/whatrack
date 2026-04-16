import { prisma } from '@/lib/db/prisma'
import { metaAccessTokenService } from './access-token.service'
import {
  assertMetaAdAccountAllowedForProject,
  syncOrganizationSubscriptionItems,
} from '@/services/billing/billing-subscription.service'
import { metaApiRequest } from './meta-api'

interface MetaAdAccountResponse {
  id: string
  name: string
  account_status: number
}

export class MetaAdAccountService {
  /**
   * Fetch Ad Accounts from Meta API and sync with local DB
   */
  async syncAdAccounts(connectionId: string, projectId?: string) {
    const connection = await prisma.metaConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) throw new Error('Meta Connection not found')

    // Use provided projectId or fall back to connection's projectId
    const effectiveProjectId = projectId || connection.projectId
    if (!effectiveProjectId) {
      throw new Error('projectId is required (neither provided nor on connection)')
    }

    const token = await metaAccessTokenService.getDecryptedToken(connectionId)

    // Fetch accounts available to this user
    const response = await metaApiRequest<{ data: MetaAdAccountResponse[] }>('me/adaccounts', {
      params: {
        access_token: token,
        fields: 'id,name,account_status',
        limit: 100,
      },
    })

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
          projectId: effectiveProjectId,
        },
        create: {
          organizationId: connection.organizationId,
          projectId: effectiveProjectId,
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
  async toggleAccount(
    accountId: string,
    input: {
      isActive?: boolean
      projectId?: string
    }
  ) {
    const existing = await prisma.metaAdAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        organizationId: true,
        projectId: true,
      },
    })

    if (!existing) {
      throw new Error('Conta Meta Ads não encontrada')
    }

    const nextProjectId =
      typeof input.projectId !== 'undefined' ? input.projectId : existing.projectId
    const nextIsActive = typeof input.isActive === 'boolean' ? input.isActive : true

    if (nextIsActive) {
      await assertMetaAdAccountAllowedForProject({
        organizationId: existing.organizationId,
        projectId: nextProjectId,
      })
    }

    const updated = await prisma.metaAdAccount.update({
      where: { id: accountId },
      data: {
        ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
        ...(typeof input.projectId !== 'undefined' ? { projectId: input.projectId } : {}),
      },
      select: {
        id: true,
        adAccountId: true,
        adAccountName: true,
        isActive: true,
        projectId: true,
        project: {
          select: {
            name: true,
          },
        },
      },
    })

    await syncOrganizationSubscriptionItems(existing.organizationId)

    return updated
  }

  /**
   * Get active accounts for an organization and project
   */
  async getActiveAccounts(organizationId: string, projectId: string) {
    return await prisma.metaAdAccount.findMany({
      where: {
        organizationId,
        projectId,
        isActive: true,
      },
      select: {
        id: true,
        organizationId: true,
        connectionId: true,
        adAccountId: true,
        adAccountName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        connection: {
          select: {
            id: true,
            fbUserId: true,
            fbUserName: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    })
  }
}

export const metaAdAccountService = new MetaAdAccountService()
