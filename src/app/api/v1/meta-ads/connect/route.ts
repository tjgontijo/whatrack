import { NextRequest, NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { buildMetaAdsAuthorizeUrl } from '@/services/meta-ads/meta-oauth.service'
import { createMetaOAuthState } from '@/services/meta-ads/meta-oauth-state.service'

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.META_ADS_APP_ID
  const redirectUri =
    process.env.META_OAUTH_REDIRECT_URI || `${process.env.APP_URL}/api/v1/meta-ads/callback`

  if (!clientId) {
    console.error('[MetaAdsConnect] META_ADS_APP_ID not configured')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
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
