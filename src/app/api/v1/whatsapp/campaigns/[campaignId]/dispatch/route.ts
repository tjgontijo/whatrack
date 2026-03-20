import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { dispatchCampaign } from '@/services/whatsapp/whatsapp-campaign.service'
import {
  processDispatchGroup,
  checkAndCompleteCampaign,
} from '@/services/whatsapp/whatsapp-campaign-execution.service'
import { whatsappCampaignDispatchSchema } from '@/schemas/whatsapp/whatsapp-campaign-schemas'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params
  const parsed = whatsappCampaignDispatchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
  }

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined

  const result = await dispatchCampaign(
    access.organizationId,
    campaignId,
    access.userId,
    parsed.data.immediate,
    scheduledAt
  )

  if (!result.success) {
    return apiError(result.error, result.status)
  }

  if (parsed.data.immediate) {
    const groups = await prisma.whatsAppCampaignDispatchGroup.findMany({
      where: { campaignId, status: 'PENDING' },
      select: { id: true },
    })

    for (const group of groups) {
      try {
        const groupResult = await processDispatchGroup(group.id, access.organizationId)
        await checkAndCompleteCampaign(campaignId)
        logger.info(
          { ...groupResult, campaignId, groupId: group.id },
          '[WhatsAppCampaignDispatch] Group processed'
        )
      } catch (error) {
        logger.error(
          { err: error, campaignId, groupId: group.id },
          '[WhatsAppCampaignDispatch] Group error'
        )
      }
    }
  }

  return apiSuccess({ success: true })
}
