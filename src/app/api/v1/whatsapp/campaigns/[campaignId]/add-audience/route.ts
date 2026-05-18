import { addCampaignAudienceService } from '@/features/whatsapp/services/add-campaign-audience.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params

  try {
    const body = await request.json()
    const result = await addCampaignAudienceService(campaignId, access.organizationId, body)
    return apiSuccess(result)
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      return apiError(error.message, error.status as number)
    }
    logger.error({ err: error }, '[api/campaigns/add-audience] error')
    return apiError('Payload inválido', 400)
  }
}
