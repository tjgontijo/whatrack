import { Worker } from 'bullmq'
import { metaCapiService } from '@/features/meta-ads/services/capi.service'
import { getRedis } from '@/lib/db/redis'
import { logger } from '@/lib/utils/logger'
import type { MetaCapiJobData } from '@/server/queues/meta-capi.queue'

export const metaCapiWorker = new Worker<MetaCapiJobData>(
  'meta-capi',
  async (job) => {
    const { dealId, pixelId, eventName, fireOnce, dealValue } = job.data
    logger.info({ dealId, pixelId, eventName, jobId: job.id }, '[CAPI Worker] Processing')
    await metaCapiService.sendEvent(dealId, eventName, pixelId, {
      eventId: `${eventName.toLowerCase()}-${dealId}-${pixelId}`,
      value: dealValue,
      fireOnce,
    })
    logger.info({ dealId, jobId: job.id }, '[CAPI Worker] Done')
  },
  {
    connection: getRedis(),
    concurrency: 10,
  }
)
