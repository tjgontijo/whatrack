import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { buildMetaAdsAuthorizeUrl } from '@/services/meta-ads/meta-oauth.service'
import { createMetaOAuthState } from '@/services/meta-ads/meta-oauth-state.service'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError(access.error || 'Unauthorized', 401)
  }

  const clientId = process.env.META_ADS_APP_ID
  const origin = req.nextUrl.origin
  const redirectUri =
    process.env.META_OAUTH_REDIRECT_URI || `${origin}/api/v1/meta-ads/callback`

  if (!clientId) {
    logger.error('[MetaAdsConnect] META_ADS_APP_ID not configured')
    return apiError('Server configuration error', 500)
  }

  const stateToken = await createMetaOAuthState({
    organizationId: access.organizationId,
    userId: access.userId,
  })

  const authUrl = buildMetaAdsAuthorizeUrl({
    clientId,
    redirectUri,
    stateToken,
  })

  return NextResponse.redirect(authUrl)
}
