import { logger } from '@/lib/utils/logger'
import { executeLockedCronJob } from '@/services/cron/cron-execution.service'
import { drainDueClassifications } from '@/services/ai/ai-classifier.scheduler'
import { dispatchAiEvent } from '@/services/ai/ai-execution.service'

export async function runAiClassifierCronJob() {
  return executeLockedCronJob({
    jobType: 'ai-classifier',
    loggerLabel: 'AI Classifier Cron',
    run: async () => {
      const due = await drainDueClassifications(20)

      logger.info(`[AI Classifier Cron] ${due.length} tickets due for analysis`)

      const results = await Promise.allSettled(
        due.map(({ ticketId, organizationId }) =>
          dispatchAiEvent('CONVERSATION_IDLE_3M', ticketId, organizationId),
        ),
      )

      return {
        processed: due.length,
        dispatched: results.filter((result) => result.status === 'fulfilled').length,
        failed: results.filter((result) => result.status === 'rejected').length,
      }
    },
  })
}
