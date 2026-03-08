import { whatsappHealthCheckJob } from '@/jobs/whatsapp-health-check.job'
import { executeLockedCronJob } from '@/services/cron/cron-execution.service'

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
