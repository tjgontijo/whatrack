import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { removeOptOut } from '@/lib/whatsapp/services/whatsapp-opt-out.service'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ optOutId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { optOutId } = await params

  const result = await removeOptOut(optOutId, access.organizationId)

  if (!result.success) {
    return apiError(result.error, result.error === 'not_found' ? 404 : 400)
  }

  return apiSuccess(null)
}
