import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { duplicateCampaign } from '@/services/whatsapp/whatsapp-campaign-duplicate.service'

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

  const result = await duplicateCampaign(campaignId, access.organizationId)

  if (!result.success) {
    return apiError(result.error, 400)
  }

  return apiSuccess(result.data)
}
