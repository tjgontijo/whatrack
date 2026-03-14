import { NextRequest, NextResponse } from 'next/server'
import { getAiUsageLogs } from '@/services/ai/ai-cost-tracking.service'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const access = await validatePermissionAccess(req, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const feature = searchParams.get('feature') || undefined
    const status = searchParams.get('status') || undefined
    const eventType = searchParams.get('eventType') || undefined

    const result = await getAiUsageLogs(access.organizationId, {
      page,
      limit,
      feature: feature as string | undefined,
      status: status as string | undefined,
      eventType: eventType as string | undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[GET ai-usage-logs] Error')
    return apiError('Failed to fetch usage logs', 500, error instanceof Error ? error.message : undefined)
  }
}
