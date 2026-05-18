import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { dispatchCampaign } from '@/features/whatsapp/services/whatsapp-campaign.service'
import { whatsappCampaignDispatchSchema } from '@/features/whatsapp/schemas/whatsapp-campaign-schemas'
import { enqueueCampaignDispatch } from '@/server/queues/campaign.queue'

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
    scheduledAt,
  )

  if (!result.success) {
    return apiError(result.error, result.status)
  }

  const delayMs =
    !parsed.data.immediate && scheduledAt && scheduledAt.getTime() > Date.now()
      ? scheduledAt.getTime() - Date.now()
      : undefined

  await enqueueCampaignDispatch(campaignId, access.organizationId, delayMs)

  return apiSuccess({ success: true })
}
