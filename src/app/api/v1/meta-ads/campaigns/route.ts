import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { campaignsQuerySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { metaCampaignsService } from '@/services/meta-ads/campaigns.service'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:campaigns')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const parsed = campaignsQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  try {
    const campaigns = await metaCampaignsService.getCampaigns(access.organizationId, {
      days: parsed.data.days,
      accountId: parsed.data.accountId,
    })

    return apiSuccess(campaigns)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error({ err: message }, '[Meta Campaigns API]')
    return apiError('Failed to fetch campaigns', 500, message)
  }
}
