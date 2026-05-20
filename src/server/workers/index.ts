import { logger } from '@/lib/utils/logger'
import { campaignDispatchWorker } from './campaign-dispatch.worker'
import { companyEnrichmentWorker } from './company-enrichment.worker'
import { metaCapiWorker } from './meta-capi.worker'
import { metaInsightSyncWorker } from './meta-insight-sync.worker'
import { dashboardProjectorWorker } from './dashboard-projector.worker'
import { getMetaInsightSyncQueue } from '@/server/queues/meta-insight-sync.queue'
import { getDashboardProjectorQueue } from '@/server/queues/dashboard-projector.queue'

const workers = [
  { name: 'campaign-dispatch', worker: campaignDispatchWorker },
  { name: 'company-enrichment', worker: companyEnrichmentWorker },
  { name: 'meta-capi', worker: metaCapiWorker },
  { name: 'meta-insight-sync', worker: metaInsightSyncWorker },
  { name: 'dashboard-projector', worker: dashboardProjectorWorker },
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

  // Dashboard projection: daily at 3 AM (after sync-history)
  const projectorQueue = getDashboardProjectorQueue()
  await projectorQueue.add(
    'project',
    {
      date: new Date().toISOString().split('T')[0], // Will be overridden by schedule
    },
    {
      repeat: {
        pattern: '0 3 * * *', // Daily at 3 AM
      },
      jobId: 'dashboard-project-daily',
    }
  )

  logger.info(`[Workers] Started ${workers.length} workers with repeat jobs`)
}
