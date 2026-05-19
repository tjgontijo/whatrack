import { logger } from '@/lib/utils/logger'
import { campaignDispatchWorker } from './campaign-dispatch.worker'
import { metaCapiWorker } from './meta-capi.worker'

const workers = [
  { name: 'campaign-dispatch', worker: campaignDispatchWorker },
  { name: 'meta-capi', worker: metaCapiWorker },
]

export function startWorkers() {
  workers.forEach(({ name, worker }) => {
    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, `[${name} Worker] Job failed`)
    })
  })

  logger.info(`[Workers] Started ${workers.length} workers`)
}
