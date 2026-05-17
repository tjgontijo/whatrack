import { webhookRetryJob } from '@/features/whatsapp/jobs/webhook-retry.job'
import { executeLockedCronJob } from '@/features/cron/services/cron-execution.service'

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
