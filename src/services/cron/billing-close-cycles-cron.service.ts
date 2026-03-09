import { closeDueBillingCycles } from '@/services/billing/billing-overage-closeout.service'
import { executeLockedCronJob } from '@/services/cron/cron-execution.service'

export async function runBillingCloseCyclesCronJob() {
  return executeLockedCronJob({
    jobType: 'billing-close-cycles',
    loggerLabel: 'BillingCloseCyclesCron',
    run: async () => closeDueBillingCycles(),
  })
}
