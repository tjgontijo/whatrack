import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { cronTriggerBodySchema } from '@/features/cron/schemas/cron.schemas'
import { authorizeCronRequest } from '@/server/cron/cron-auth'
import { prisma } from '@/lib/db/prisma'
import { enqueueCampaignDispatch } from '@/server/queues/campaign.queue'
import { logger } from '@/lib/utils/logger'

const ENDPOINT = '/api/v1/cron/whatsapp/campaign-dispatch'

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeCronRequest(request, ENDPOINT)
  if (authorizationError) return authorizationError

  const parseResult = cronTriggerBodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parseResult.success) {
    return apiError('Invalid cron payload', 400, parseResult.error.flatten())
  }

  const now = new Date()
  const campaigns = await prisma.whatsAppCampaign.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    select: { id: true, organizationId: true },
  })

  if (campaigns.length === 0) {
    return apiSuccess({ success: true, campaignsEnqueued: 0 })
  }

  for (const campaign of campaigns) {
    await enqueueCampaignDispatch(campaign.id, campaign.organizationId)
  }

  logger.info({ count: campaigns.length }, '[CronDispatch] Campaigns enqueued')

  return apiSuccess({ success: true, campaignsEnqueued: campaigns.length })
}
