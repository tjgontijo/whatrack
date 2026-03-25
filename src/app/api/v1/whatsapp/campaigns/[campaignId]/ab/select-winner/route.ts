import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { selectWinner } from '@/services/whatsapp/whatsapp-campaign-ab.service'
import { AbTestSelectWinnerSchema } from '@/lib/whatsapp/schemas/whatsapp-ab-schemas'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params

  const body = AbTestSelectWinnerSchema.safeParse(await request.json().catch(() => ({})))
  if (!body.success) {
    return apiError('Payload inválido', 400, undefined, { details: body.error.flatten() })
  }

  const result = await selectWinner(campaignId, body.data.variantId, access.userId, access.organizationId)

  if (!result.success) {
    return apiError(result.error, 400)
  }

  return apiSuccess({ success: true })
}
