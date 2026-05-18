import { executeLockedCronJob } from '@/features/cron/services/cron-execution.service'
import { whatsappHealthCheckJob } from '@/features/whatsapp/jobs/whatsapp-health-check.job'

export async function runWhatsAppHealthCheckCronJob() {
  return executeLockedCronJob({
    jobType: 'whatsapp-health-check',
    loggerLabel: 'WhatsAppHealthCheckCron',
    run: async ({ jobId }) => {
      await whatsappHealthCheckJob({ id: jobId })

      return {
        message: 'WhatsApp health check completed',
      }
    },
  })
}
