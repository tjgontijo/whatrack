import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { campaignsQuerySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { metaCampaignsService } from '@/services/meta-ads/campaigns.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:campaigns')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const parsed = campaignsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  const scopedOrganizationId = parsed.data.organizationId ?? access.organizationId
  if (scopedOrganizationId !== access.organizationId) {
    return apiError('Forbidden for requested organization', 403)
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
    return apiError('Failed to fetch campaigns', 500, message)
  }
}
