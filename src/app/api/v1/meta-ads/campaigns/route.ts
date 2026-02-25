import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { metaCampaignsService } from '@/services/meta-ads/campaigns.service'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

const campaignsQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  accountId: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:campaigns')
  if (!access.hasAccess || !access.teamId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = campaignsQuerySchema.safeParse(Object.fromEntries(searchParams))
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

  const { accountId, days } = parsed.data

  try {
    const campaigns = await metaCampaignsService.getCampaigns(access.teamId, { days, accountId })
    return NextResponse.json(campaigns)
  } catch (error: any) {
    console.error('[Meta Campaigns API]', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error.message },
      { status: 500 }
    )
  }
}
