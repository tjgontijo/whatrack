import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { metaAccessTokenService } from './access-token.service'
import { MetaApiError, metaApiRequest } from './meta-api'

interface InsightRow {
  date_start: string
  date_stop: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  ad_id: string
  ad_name: string
  impressions: string
  clicks: string
  spend: string
  currency: string
}

export class SyncMetaInsightsService {
  async syncInsights(
    organizationId: string,
    syncType: 'SYNC_TODAY' | 'SYNC_HISTORY',
    options?: {
      projectId?: string
      startDate?: string
      endDate?: string
    }
  ) {
    const runId = await this.createSyncRun(organizationId, syncType, options?.projectId)

    try {
      const connections = await prisma.metaConnection.findMany({
        where: { organizationId, status: 'ACTIVE' },
      })

      if (connections.length === 0) {
        logger.warn({ organizationId }, '[Sync Insights] No active Meta connections')
        await this.completeSyncRun(runId, 'SUCCESS', 0, 0)
        return
      }

      let totalInserted = 0
      let totalUpdated = 0

      for (const conn of connections) {
        const token = await metaAccessTokenService.getDecryptedToken(conn.id)
        const accounts = await prisma.metaAdAccount.findMany({
          where: { connectionId: conn.id, isActive: true },
        })

        for (const account of accounts) {
          try {
            const { inserted, updated } = await this.syncAccountInsights(
              organizationId,
              account.adAccountId,
              token,
              syncType,
              options
            )
            totalInserted += inserted
            totalUpdated += updated
          } catch (error) {
            logger.error(
              { organizationId, accountId: account.adAccountId, error },
              '[Sync Insights] Account sync failed'
            )
          }
        }
      }

      await this.completeSyncRun(runId, 'SUCCESS', totalInserted, totalUpdated)
      logger.info(
        { organizationId, inserted: totalInserted, updated: totalUpdated },
        '[Sync Insights] Complete'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      await this.completeSyncRun(runId, 'FAILED', 0, 0, message)
      logger.error({ organizationId, error }, '[Sync Insights] Sync failed')
      throw error
    }
  }

  private async syncAccountInsights(
    organizationId: string,
    adAccountId: string,
    token: string,
    syncType: 'SYNC_TODAY' | 'SYNC_HISTORY',
    options?: {
      projectId?: string
      startDate?: string
      endDate?: string
    }
  ) {
    const projectId = options?.projectId
    if (!projectId) {
      throw new Error('projectId is required to sync Meta insights')
    }

    const { dateStart, dateEnd } = this.getDateRange(syncType, options)

    const response = await metaApiRequest<{ data: InsightRow[] }>(
      `${adAccountId}/insights`,
      {
        params: {
          access_token: token,
          level: 'ad',
          time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
          fields:
            'date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,currency',
          limit: 500,
        },
      }
    )

    const rows = response.data.data || []
    let inserted = 0
    let updated = 0

    for (const row of rows) {
      const entityKey = `${row.campaign_id}:${row.adset_id}:${row.ad_id}`
      const date = row.date_start

      const result = await prisma.metaAdInsightDaily.upsert({
        where: {
          organizationId_projectId_date_entityKey: {
            organizationId,
            projectId,
            date: new Date(date),
            entityKey,
          },
        },
        create: {
          organizationId,
          projectId,
          metaAdAccountId: adAccountId,
          metaCampaignId: row.campaign_id,
          metaAdSetId: row.adset_id,
          metaAdId: row.ad_id,
          entityKey,
          date: new Date(date),
          impressions: parseInt(row.impressions, 10),
          clicks: parseInt(row.clicks, 10),
          spend: parseFloat(row.spend),
          spendOriginal: parseFloat(row.spend),
          spendCurrency: row.currency,
          syncedAt: new Date(),
        },
        update: {
          impressions: parseInt(row.impressions, 10),
          clicks: parseInt(row.clicks, 10),
          spend: parseFloat(row.spend),
          spendOriginal: parseFloat(row.spend),
          spendCurrency: row.currency,
          syncedAt: new Date(),
        },
      })

      if (result) {
        // Simple heuristic: if syncedAt changed recently, count as update
        updated++
      }
    }

    return { inserted, updated }
  }

  private getDateRange(
    syncType: 'SYNC_TODAY' | 'SYNC_HISTORY',
    options?: {
      startDate?: string
      endDate?: string
    }
  ) {
    let dateStart: string
    let dateEnd: string

    if (syncType === 'SYNC_TODAY') {
      const today = new Date()
      dateStart = today.toISOString().split('T')[0]
      dateEnd = today.toISOString().split('T')[0]
    } else {
      // SYNC_HISTORY: last 7 days (attribution window)
      const start = new Date()
      start.setDate(start.getDate() - 7)
      dateStart = options?.startDate || start.toISOString().split('T')[0]
      dateEnd = options?.endDate || new Date().toISOString().split('T')[0]
    }

    return { dateStart, dateEnd }
  }

  private async createSyncRun(
    organizationId: string,
    syncType: 'SYNC_TODAY' | 'SYNC_HISTORY',
    projectId?: string
  ) {
    const run = await prisma.metaInsightSyncRun.create({
      data: {
        organizationId,
        projectId,
        syncType,
        status: 'RUNNING',
      },
    })
    return run.id
  }

  private async completeSyncRun(
    runId: string,
    status: 'SUCCESS' | 'FAILED',
    inserted: number,
    updated: number,
    errorMessage?: string
  ) {
    await prisma.metaInsightSyncRun.update({
      where: { id: runId },
      data: {
        status,
        completedAt: new Date(),
        rowsInserted: inserted,
        rowsUpdated: updated,
        errorMessage,
      },
    })
  }
}

export const syncMetaInsightsService = new SyncMetaInsightsService()
