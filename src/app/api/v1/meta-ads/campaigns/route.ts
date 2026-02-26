import { NextRequest, NextResponse } from 'next/server'

import { campaignsQuerySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { metaCampaignsService } from '@/services/meta-ads/campaigns.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:campaigns')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const parsed = campaignsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
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

  try {
    const campaigns = await metaCampaignsService.getCampaigns(access.organizationId, {
      days: parsed.data.days,
      accountId: parsed.data.accountId,
    })

    return NextResponse.json(campaigns)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Meta Campaigns API]', message)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: message },
      { status: 500 }
    )
  }
}
