import 'dotenv/config'
import { Worker } from 'bullmq'
import { getRedis } from './lib/db/redis'
import { runCampaignDispatch } from './features/whatsapp/services/whatsapp-campaign-execution.service'
import { logger } from './lib/utils/logger'
import type { CampaignDispatchJobData } from './server/queues/campaign.queue'

const worker = new Worker<CampaignDispatchJobData>(
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
  },
)

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[Worker] Job failed')
})

logger.info('[Worker] Campaign dispatch worker started')
