import { NextRequest, NextResponse } from 'next/server'

import { insightsQuerySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { metaAdInsightsService } from '@/services/meta-ads/ad-insights.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:campaigns')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const parsed = insightsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const scopedOrganizationId = parsed.data.organizationId ?? access.organizationId
  if (scopedOrganizationId !== access.organizationId) {
    return NextResponse.json({ error: 'Forbidden for requested organization' }, { status: 403 })
  }

  const roi = await metaAdInsightsService.getROI(access.organizationId, parsed.data.days)
  return NextResponse.json(roi)
}
