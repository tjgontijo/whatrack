import { NextResponse } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { previewAudience } from '@/services/whatsapp/whatsapp-campaign-audience.service'
import { whatsappCampaignPreviewAudienceSchema } from '@/schemas/whatsapp/whatsapp-campaign-schemas'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const parsed = whatsappCampaignPreviewAudienceSchema.safeParse(await request.json())
  if (!parsed.success) {
    return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
  }

  const result = await previewAudience(access.organizationId, parsed.data)

  return apiSuccess(result)
}
