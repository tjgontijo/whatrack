import { NextResponse } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { submitForApproval } from '@/services/whatsapp/whatsapp-campaign.service'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(_request)
  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params
  const result = await submitForApproval(access.organizationId, campaignId, access.userId)

  if (!result.success) {
    return apiError(result.error, result.status)
  }

  return apiSuccess({ success: true })
}
