import { NextResponse } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { updateCampaign, getCampaign } from '@/services/whatsapp/whatsapp-campaign.service'
import { getCampaignDetail } from '@/services/whatsapp/whatsapp-campaign-query.service'
import { whatsappCampaignUpdateSchema } from '@/schemas/whatsapp/whatsapp-campaign-schemas'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(_request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params
  const campaign = await getCampaignDetail(access.organizationId, campaignId)

  if (!campaign) {
    return apiError('Campanha não encontrada', 404)
  }

  return apiSuccess(campaign)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params
  const parsed = whatsappCampaignUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
  }

  const result = await updateCampaign(access.organizationId, campaignId, parsed.data)

  if (!result.success) {
    return apiError(result.error, result.status)
  }

  return apiSuccess(result.data)
}
