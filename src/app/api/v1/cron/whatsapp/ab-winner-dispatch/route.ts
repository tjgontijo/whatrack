import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { authorizeCronRequest } from '@/server/cron/cron-auth'
import { getJobTracker } from '@/lib/db/queue'
import { prisma } from '@/lib/db/prisma'
import { autoSelectWinner } from '@/services/whatsapp/whatsapp-campaign-ab.service'
import { logger } from '@/lib/utils/logger'
import { cronTriggerBodySchema } from '@/schemas/cron/cron-schemas'

export const maxDuration = 300

const ENDPOINT = '/api/v1/cron/whatsapp/ab-winner-dispatch'
const JOB_TYPE = 'whatsapp-ab-winner-dispatch' as const

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeCronRequest(request, ENDPOINT)
  if (authorizationError) return authorizationError

  const parseResult = cronTriggerBodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parseResult.success) {
    return apiError('Invalid cron payload', 400, parseResult.error.flatten())
  }

  const jobTracker = getJobTracker()
  const jobId = await jobTracker.acquireLock(JOB_TYPE)
  if (!jobId) {
    return apiSuccess({ success: false, message: 'AB winner dispatch already running' }, 429)
  }

  try {
    const now = new Date()

    // Find A/B campaigns where window has expired and no winner yet
    const campaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        isAbTest: true,
        status: { in: ['PROCESSING', 'COMPLETED'] },
      },
      select: { id: true, organizationId: true, abTestConfig: true, startedAt: true },
    })

    // Filter to only campaigns where window has expired and no winner selected
    const eligible = campaigns.filter((c) => {
      const config = c.abTestConfig as any
      if (config?.winnerVariantId) return false // already has winner
      if (!c.startedAt || !config?.windowHours) return false
      const expiresAt = new Date(c.startedAt.getTime() + config.windowHours * 60 * 60 * 1000)
      return expiresAt <= now
    })

    if (eligible.length === 0) {
      await jobTracker.releaseLock(JOB_TYPE, jobId)
      return apiSuccess({ success: true, processed: 0 })
    }

    let processed = 0
    let selected = 0
    const errors: Array<{ campaignId: string; error: string }> = []

    for (const campaign of eligible) {
      try {
        const result = await autoSelectWinner(campaign.id, campaign.organizationId)
        if (result.success && result.data.selected) selected++
        processed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push({ campaignId: campaign.id, error: msg })
        logger.error({ err, campaignId: campaign.id }, '[AbWinnerCron] Error')
      }
    }

    await jobTracker.releaseLock(JOB_TYPE, jobId)

    logger.info({ eligible: eligible.length, processed, selected, errors: errors.length }, '[AbWinnerCron] Complete')

    return apiSuccess({ success: true, processed, selected, errors })
  } catch (err) {
    await jobTracker.releaseLock(JOB_TYPE, jobId)
    return apiError(err instanceof Error ? err.message : 'Unknown error', 500, err)
  }
}
