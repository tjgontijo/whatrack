import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { cronTriggerBodySchema } from '@/schemas/cron/cron-schemas'
import { authorizeCronRequest } from '@/server/cron/cron-auth'
import { getJobTracker } from '@/lib/db/queue'
import { prisma } from '@/lib/db/prisma'
import {
  processDispatchGroup,
  checkAndCompleteCampaign,
} from '@/services/whatsapp/whatsapp-campaign-execution.service'
import { logger } from '@/lib/utils/logger'

export const maxDuration = 300
const ENDPOINT = '/api/v1/cron/whatsapp/campaign-dispatch'
const JOB_TYPE = 'whatsapp-campaign-dispatch' as const

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
    return apiSuccess({ success: false, message: 'Campaign dispatch already running' }, 429)
  }

  try {
    const now = new Date()
    const campaigns = await prisma.whatsAppCampaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      select: { id: true, organizationId: true },
    })

    if (campaigns.length === 0) {
      await jobTracker.releaseLock(JOB_TYPE, jobId)
      return apiSuccess({ success: true, campaignsProcessed: 0 })
    }

    let groupsProcessed = 0
    const errors: Array<{ campaignId: string; error: string }> = []

    for (const campaign of campaigns) {
      try {
        await prisma.whatsAppCampaign.update({
          where: { id: campaign.id },
          data: { status: 'PROCESSING', startedAt: new Date() },
        })

        const groups = await prisma.whatsAppCampaignDispatchGroup.findMany({
          where: { campaignId: campaign.id, status: 'PENDING' },
          select: { id: true },
        })

        for (const group of groups) {
          await processDispatchGroup(group.id, campaign.organizationId)
          groupsProcessed++
        }

        await checkAndCompleteCampaign(campaign.id)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        errors.push({ campaignId: campaign.id, error: msg })
        logger.error({ err: error, campaignId: campaign.id }, '[WhatsAppCampaignCron] Error')
      }
    }

    await jobTracker.releaseLock(JOB_TYPE, jobId)

    logger.info(
      { campaigns: campaigns.length, groupsProcessed, errors: errors.length },
      '[WhatsAppCampaignCron] Dispatch complete'
    )

    return apiSuccess({
      success: true,
      campaignsProcessed: campaigns.length,
      groupsProcessed,
      errors,
    })
  } catch (error) {
    await jobTracker.releaseLock(JOB_TYPE, jobId)
    return apiError(error instanceof Error ? error.message : 'Unknown error', 500, error)
  }
}
