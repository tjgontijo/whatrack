import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { getHourlyHeatmap } from '@/services/analytics'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const access = await validatePermissionAccess(req, 'view:analytics')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = endDateParam ? new Date(endDateParam) : new Date()

    const data = await getHourlyHeatmap(access.organizationId, startDate, endDate)
    return NextResponse.json(data)
  } catch (error) {
    logger.error({ err: error }, '[Analytics Heatmap API] GET Error')
    return apiError('Internal Server Error', 500, error)
  }
}
