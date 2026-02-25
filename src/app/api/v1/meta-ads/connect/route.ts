import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { getRedis } from '@/lib/db/redis'

const OAUTH_STATE_TTL_SECONDS = 600 // 10 minutes

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

  // Generate a random, single-use state token to prevent CSRF attacks.
  // Store { organizationId, userId } in Redis with a TTL of 10 minutes.
  const stateToken = randomUUID()
  const redis = getRedis()
  await redis.setex(
    `oauth_state:${stateToken}`,
    OAUTH_STATE_TTL_SECONDS,
    JSON.stringify({ organizationId: access.organizationId, userId: access.userId })
  )

  const scopes = ['ads_read', 'ads_management', 'public_profile'].join(',')
  const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${stateToken}&response_type=code`

  return NextResponse.redirect(authUrl)
}
