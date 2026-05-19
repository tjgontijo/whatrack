import { Queue } from 'bullmq'
import { getRedis } from '@/lib/db/redis'

export interface MetaInsightSyncJobData {
  organizationId: string
  projectId?: string
  syncType: 'SYNC_TODAY' | 'SYNC_HISTORY'
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
}

const QUEUE_NAME = 'meta-insight-sync'

let metaInsightSyncQueue: Queue<MetaInsightSyncJobData> | null = null

export function getMetaInsightSyncQueue(): Queue<MetaInsightSyncJobData> {
  if (!metaInsightSyncQueue) {
    metaInsightSyncQueue = new Queue(QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  }
  return metaInsightSyncQueue
}

export async function enqueueMetaInsightSync(
  organizationId: string,
  syncType: 'SYNC_TODAY' | 'SYNC_HISTORY',
  options?: {
    projectId?: string
    startDate?: string
    endDate?: string
    priority?: number
  }
) {
  const queue = getMetaInsightSyncQueue()
  const jobId = options?.priority === 1
    ? `meta-sync-force-${organizationId}-${Date.now()}`
    : `meta-sync-${organizationId}-${syncType}`

  return queue.add(
    syncType,
    {
      organizationId,
      projectId: options?.projectId,
      syncType,
      startDate: options?.startDate,
      endDate: options?.endDate,
    },
    {
      jobId,
      priority: options?.priority,
    }
  )
}
