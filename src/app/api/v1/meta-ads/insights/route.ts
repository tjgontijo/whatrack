import type { NextRequest } from 'next/server'
import { insightsQuerySchema } from '@/features/meta-ads/schemas/meta-ads-schemas'
import { metaAdInsightsService } from '@/features/meta-ads/services/ad-insights.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:campaigns')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const parsed = insightsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  const roi = await metaAdInsightsService.getROI(access.organizationId, parsed.data.days)
  return apiSuccess(roi)
}
