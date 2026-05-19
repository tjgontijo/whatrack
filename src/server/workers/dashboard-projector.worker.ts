import { Worker } from 'bullmq'
import { dashboardDailyProjector } from '@/features/dashboard/projectors/dashboard-daily.projector'
import { getRedis } from '@/lib/db/redis'
import { logger } from '@/lib/utils/logger'
import type { DashboardProjectorJobData } from '@/server/queues/dashboard-projector.queue'

export const dashboardProjectorWorker = new Worker<DashboardProjectorJobData>(
  'dashboard-projector',
  async (job) => {
    const { date } = job.data
    logger.info({ date, jobId: job.id }, '[Dashboard Projector Worker] Processing')

    await dashboardDailyProjector.projectMetrics(date)

    logger.info({ date, jobId: job.id }, '[Dashboard Projector Worker] Complete')
  },
  {
    connection: getRedis(),
    concurrency: 2,
  }
)
