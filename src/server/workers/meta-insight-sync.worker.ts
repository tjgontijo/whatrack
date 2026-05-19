import { Worker } from 'bullmq'
import { prisma } from '@/lib/db/prisma'
import { syncMetaInsightsService } from '@/features/meta-ads/services/sync-meta-insights.service'
import { getRedis } from '@/lib/db/redis'
import { logger } from '@/lib/utils/logger'
import type { MetaInsightSyncJobData } from '@/server/queues/meta-insight-sync.queue'

export const metaInsightSyncWorker = new Worker<MetaInsightSyncJobData>(
  'meta-insight-sync',
  async (job) => {
    const { organizationId, syncType, projectId, startDate, endDate } = job.data
    logger.info({ organizationId, syncType, jobId: job.id }, '[Meta Sync Worker] Processing')

    // If organizationId is __system__, sync all organizations
    if (organizationId === '__system__') {
      const orgs = await prisma.organization.findMany({
        select: { id: true },
      })
      for (const org of orgs) {
        await syncMetaInsightsService.syncInsights(org.id, syncType)
      }
    } else {
      await syncMetaInsightsService.syncInsights(organizationId, syncType, {
        projectId,
        startDate,
        endDate,
      })
    }

    logger.info({ organizationId, jobId: job.id }, '[Meta Sync Worker] Complete')
  },
  {
    connection: getRedis(),
    concurrency: 3,
  }
)
