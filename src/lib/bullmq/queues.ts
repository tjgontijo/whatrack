/**
 * BullMQ Queue Configuration
 * Defines queues for follow-up message processing
 */

import { Queue } from 'bullmq'
import { getRedisClient } from '@/lib/redis/redis-client'

export interface FollowupJobData {
  scheduledMessageId: string
  ticketId: string
  organizationId: string
  step: number
}

let followupQueue: Queue<FollowupJobData> | null = null

export function getFollowupQueue(): Queue<FollowupJobData> {
  if (!followupQueue) {
    followupQueue = new Queue<FollowupJobData>('followup', {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
        },
        removeOnFail: {
          count: 5000,
        },
      },
    })
  }
  return followupQueue
}

export async function closeQueues(): Promise<void> {
  if (followupQueue) {
    await followupQueue.close()
    followupQueue = null
  }
}
