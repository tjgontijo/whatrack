import { Queue } from 'bullmq'
import { getRedis } from '@/lib/db/redis'

export interface DashboardProjectorJobData {
  date: string // YYYY-MM-DD
}

const QUEUE_NAME = 'dashboard-projector'

let dashboardProjectorQueue: Queue<DashboardProjectorJobData> | null = null

export function getDashboardProjectorQueue(): Queue<DashboardProjectorJobData> {
  if (!dashboardProjectorQueue) {
    dashboardProjectorQueue = new Queue(QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  }
  return dashboardProjectorQueue
}

export async function enqueueDashboardProjection(date: string) {
  const queue = getDashboardProjectorQueue()
  return queue.add('project', { date }, { jobId: `dashboard-${date}` })
}
