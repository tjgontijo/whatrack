import { logger } from '@/lib/utils/logger'
import { campaignDispatchWorker } from './campaign-dispatch.worker'
import { metaCapiWorker } from './meta-capi.worker'
import { metaInsightSyncWorker } from './meta-insight-sync.worker'
import { getMetaInsightSyncQueue } from '@/server/queues/meta-insight-sync.queue'

const workers = [
  { name: 'campaign-dispatch', worker: campaignDispatchWorker },
  { name: 'meta-capi', worker: metaCapiWorker },
  { name: 'meta-insight-sync', worker: metaInsightSyncWorker },
]

export async function startWorkers() {
  workers.forEach(({ name, worker }) => {
    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, `[${name} Worker] Job failed`)
    })
  })

  // Register repeat jobs for Meta Insights sync
  const queue = getMetaInsightSyncQueue()

  // Sync today: every hour
  await queue.add(
    'SYNC_TODAY',
    {
      organizationId: '__system__',
      syncType: 'SYNC_TODAY',
    },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour at :00
      },
      jobId: 'meta-sync-today-repeat',
    }
  )

  // Sync history: daily at 2 AM
  await queue.add(
    'SYNC_HISTORY',
    {
      organizationId: '__system__',
      syncType: 'SYNC_HISTORY',
    },
    {
      repeat: {
        pattern: '0 2 * * *', // Daily at 2 AM
      },
      jobId: 'meta-sync-history-repeat',
    }
  )

  logger.info(`[Workers] Started ${workers.length} workers with repeat jobs`)
}
