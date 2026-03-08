import { webhookRetryJob } from '@/jobs/webhook-retry.job'
import { executeLockedCronJob } from '@/services/cron/cron-execution.service'

export async function runWebhookRetryCronJob() {
  return executeLockedCronJob({
    jobType: 'webhook-retry',
    loggerLabel: 'WebhookRetryCron',
    run: async ({ jobId }) => {
      await webhookRetryJob({ id: jobId })

      return {
        message: 'Webhook retry completed',
      }
    },
  })
}
