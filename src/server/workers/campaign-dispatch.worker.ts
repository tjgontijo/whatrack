import { Worker } from 'bullmq'
import { runCampaignDispatch } from '@/features/whatsapp/services/whatsapp-campaign-execution.service'
import { getRedis } from '@/lib/db/redis'
import { logger } from '@/lib/utils/logger'
import type { CampaignDispatchJobData } from '@/server/queues/campaign.queue'

export const campaignDispatchWorker = new Worker<CampaignDispatchJobData>(
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
