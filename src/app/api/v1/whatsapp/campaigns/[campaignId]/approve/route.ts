import { NextResponse } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { approveCampaign, submitForApproval } from '@/services/whatsapp/whatsapp-campaign.service'
import { whatsappCampaignApproveSchema } from '@/schemas/whatsapp/whatsapp-campaign-schemas'

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
  const parsed = whatsappCampaignApproveSchema.safeParse(await request.json())
  if (!parsed.success) {
    return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
  }

  const result = await approveCampaign(
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
