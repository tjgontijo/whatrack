import { NextRequest, NextResponse } from 'next/server'
import { getAiUsageStats } from '@/services/ai/ai-cost-tracking.service'
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
    const period = searchParams.get('period') || '30d'

    // Parse period to days
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }
    const daysBack = daysMap[period] || 30

    const stats = await getAiUsageStats(access.organizationId, daysBack)

    return NextResponse.json({
      period,
      daysBack,
      totals: stats.totals,
      byFeature: stats.byFeature,
      daily: stats.daily,
    })
  } catch (error) {
    logger.error({ err: error }, '[GET ai-usage] Error')
    return apiError('Failed to fetch usage stats', 500, error instanceof Error ? error.message : undefined)
  }
}
