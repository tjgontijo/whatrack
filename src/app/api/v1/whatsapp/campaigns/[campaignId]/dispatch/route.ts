import { after } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { dispatchCampaign } from '@/services/whatsapp/whatsapp-campaign.service'
import { whatsappCampaignDispatchSchema } from '@/schemas/whatsapp/whatsapp-campaign-schemas'
import { logger } from '@/lib/utils/logger'
import { runCampaignDispatch } from '@/services/whatsapp/whatsapp-campaign-execution.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min max na Vercel (plano free permite até 60s, pro até 300s)

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

  // Processar em background APÓS retornar a resposta ao usuário
  if (parsed.data.immediate) {
    const orgId = access.organizationId
    after(async () => {
      logger.info({ campaignId, orgId }, '[Campaign] Starting background dispatch via after()')
      await runCampaignDispatch(campaignId, orgId)
    })
  }

  return apiSuccess({ success: true })
}
