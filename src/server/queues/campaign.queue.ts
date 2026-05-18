import { Queue } from 'bullmq'
import { getRedis } from '@/lib/db/redis'

export interface CampaignDispatchJobData {
  campaignId: string
  organizationId: string
}

const QUEUE_NAME = 'campaign-dispatch'

let campaignQueue: Queue<CampaignDispatchJobData> | null = null

export function getCampaignQueue(): Queue<CampaignDispatchJobData> {
  if (!campaignQueue) {
    campaignQueue = new Queue(QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  }
  return campaignQueue
}

export async function enqueueCampaignDispatch(
  campaignId: string,
  organizationId: string,
  delayMs?: number
) {
  const queue = getCampaignQueue()
  return queue.add(
    'dispatch',
    { campaignId, organizationId },
    {
      delay: delayMs,
      jobId: `campaign-${campaignId}`,
    }
  )
}
