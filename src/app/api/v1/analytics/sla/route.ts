import { NextRequest, NextResponse } from 'next/server'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { getSlaMetrics } from '@/services/analytics'

export async function GET(req: NextRequest) {
  try {
    const access = await validatePermissionAccess(req, 'view:analytics')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = endDateParam ? new Date(endDateParam) : new Date()

    const data = await getSlaMetrics(access.organizationId, startDate, endDate)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Analytics SLA API] GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
