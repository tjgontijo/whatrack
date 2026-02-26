import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { getLeadActivity } from '@/services/analytics'

export async function GET(req: NextRequest) {
  try {
    const access = await validatePermissionAccess(req, 'view:analytics')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const data = await getLeadActivity(access.organizationId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Analytics Lead-Activity API] GET Error:', error)
    return apiError('Internal Server Error', 500, error)
  }
}
