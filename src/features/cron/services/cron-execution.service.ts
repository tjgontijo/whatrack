import { getJobTracker, type JobType } from '@/lib/db/queue'
import { logger } from '@/lib/utils/logger'

interface ExecuteLockedCronJobParams<T> {
  jobType: JobType
  loggerLabel: string
  run: (context: { jobId: string }) => Promise<T>
}

type LockedCronJobSkipped = {
  status: 'already-running'
}

type LockedCronJobCompleted<T> = {
  status: 'completed'
  jobId: string
  data: T
}

export type LockedCronJobResult<T> = LockedCronJobSkipped | LockedCronJobCompleted<T>

export async function executeLockedCronJob<T>(
  params: ExecuteLockedCronJobParams<T>,
): Promise<LockedCronJobResult<T>> {
  const jobTracker = getJobTracker()
  const jobId = await jobTracker.acquireLock(params.jobType)

  if (!jobId) {
    logger.warn(`[${params.loggerLabel}] Job already running, skipping`)
    return { status: 'already-running' }
  }

  logger.info(`[${params.loggerLabel}] Starting job ${jobId}`)

  try {
    const data = await params.run({ jobId })

    logger.info(`[${params.loggerLabel}] Job ${jobId} completed successfully`)

    return {
      status: 'completed',
      jobId,
      data,
    }
  } catch (error) {
    logger.error({ err: error }, `[${params.loggerLabel}] Error`)
    throw error
  } finally {
    await jobTracker.releaseLock(params.jobType, jobId)
  }
}
