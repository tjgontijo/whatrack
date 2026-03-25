import { NextResponse } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listRecipients } from '@/services/whatsapp/whatsapp-campaign-query.service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
  const status = searchParams.get('status') || undefined
  const phone = searchParams.get('phone') || undefined

  const result = await listRecipients(access.organizationId, campaignId, page, pageSize, status, phone)

  if (!result) {
    return apiError('Campanha não encontrada', 404)
  }

  return apiSuccess(result)
}
