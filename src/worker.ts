import 'dotenv/config'
import { Worker } from 'bullmq'
import { runCampaignDispatch } from './features/whatsapp/services/whatsapp-campaign-execution.service'
import { metaCapiService } from './features/meta-ads/services/capi.service'
import { getRedis } from './lib/db/redis'
import { logger } from './lib/utils/logger'
import type { CampaignDispatchJobData } from './server/queues/campaign.queue'
import type { MetaCapiJobData } from './server/queues/meta-capi.queue'

const campaignWorker = new Worker<CampaignDispatchJobData>(
  'campaign-dispatch',
  async (job) => {
    const { campaignId, organizationId } = job.data
    logger.info({ campaignId, jobId: job.id }, '[Worker] Processing campaign dispatch')
    await runCampaignDispatch(campaignId, organizationId)
    logger.info({ campaignId, jobId: job.id }, '[Worker] Campaign dispatch complete')
  },
  {
    connection: getRedis(),
    concurrency: 5,
  }
)

const metaCapiWorker = new Worker<MetaCapiJobData>(
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

campaignWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[Campaign Worker] Job failed')
})

metaCapiWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[CAPI Worker] Job failed')
})

logger.info('[Worker] All workers started')
