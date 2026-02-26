import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { insightsQuerySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { metaAdInsightsService } from '@/services/meta-ads/ad-insights.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:campaigns')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const parsed = insightsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  const scopedOrganizationId = parsed.data.organizationId ?? access.organizationId
  if (scopedOrganizationId !== access.organizationId) {
    return apiError('Forbidden for requested organization', 403)
  }

  const roi = await metaAdInsightsService.getROI(access.organizationId, parsed.data.days)
  return NextResponse.json(roi)
}
