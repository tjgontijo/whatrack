import { whatsappCampaignCancelSchema } from '@/features/whatsapp/schemas/whatsapp-campaign-schemas'
import { cancelCampaign } from '@/features/whatsapp/services/whatsapp-campaign.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

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
  const parsed = whatsappCampaignCancelSchema.safeParse(await request.json())
  if (!parsed.success) {
    return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
  }

  const result = await cancelCampaign(
    access.organizationId,
    campaignId,
    access.userId,
    parsed.data.comment
  )

  if (!result.success) {
    return apiError(result.error, result.status)
  }

  return apiSuccess({ success: true })
}
