import { Queue } from 'bullmq'
import { getRedis } from '@/lib/db/redis'

export interface MetaCapiJobData {
  dealId: string
  pixelId: string
  eventName: string
  fireOnce: boolean
  dealValue?: number
}

const QUEUE_NAME = 'meta-capi'

let queue: Queue<MetaCapiJobData> | null = null

export function getMetaCapiQueue(): Queue<MetaCapiJobData> {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  }
  return queue
}

export function enqueueMetaCapiEvent(data: MetaCapiJobData) {
  return getMetaCapiQueue().add('send-event', data, {
    jobId: `capi-${data.dealId}-${data.pixelId}-${data.eventName}`,
  })
}
