import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { metaAdInsightsService } from '@/services/meta-ads/ad-insights.service'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

const insightsQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:campaigns')
  if (!access.hasAccess || !access.teamId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = insightsQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const scopedTeamId = parsed.data.teamId ?? parsed.data.organizationId ?? access.teamId
  if (scopedTeamId !== access.teamId) {
    return NextResponse.json({ error: 'Forbidden for requested team' }, { status: 403 })
  }

  const roi = await metaAdInsightsService.getROI(access.teamId, parsed.data.days)

  return NextResponse.json(roi)
}
