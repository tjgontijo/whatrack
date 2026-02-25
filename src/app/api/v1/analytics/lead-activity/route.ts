import { NextRequest, NextResponse } from 'next/server'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { getLeadActivity } from '@/services/analytics'

export async function GET(req: NextRequest) {
  try {
    const access = await validatePermissionAccess(req, 'view:analytics')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await getLeadActivity(access.organizationId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Analytics Lead-Activity API] GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
