import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { aiInsightsQuerySchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { listAiInsights } from '@/services/ai/ai-insight-query.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const parsed = aiInsightsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const insights = await listAiInsights(access.organizationId, parsed.data.status)
    return apiSuccess({ items: insights })
  } catch (error) {
    logger.error({ err: error }, '[GET ai-insights] Error')
    return apiError('Internal server error', 500, error)
  }
}
