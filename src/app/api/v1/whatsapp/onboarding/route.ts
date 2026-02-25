import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createId } from '@paralleldrive/cuid2'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

/**
 * GET /api/v1/whatsapp/onboarding
 *
 * Generate onboarding URL for Embedded Signup flow
 *
 * Rate Limiting:
 * - IP: 100 requests/hour
 * - Organization: 500 requests/hour
 * - Burst: 10 requests/minute
 *
 * Query params:
 * - organizationId: UUID (optional, defaults to active org in session)
 *
 * Response:
 * {
 *   "onboardingUrl": "https://www.facebook.com/...",
 *   "trackingCode": "...",
 *   "expiresIn": 86400
 * }
 */
export async function GET(request: NextRequest) {
  // Check rate limits first
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/whatsapp/onboarding')
  if (rateLimitResponse) return rateLimitResponse
  try {
    const access = await validatePermissionAccess(request, 'manage:whatsapp')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 })
    }
    const orgId = access.organizationId

    // Generate tracking code
    const trackingCode = createId()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create onboarding record
    const onboarding = await prisma.whatsAppOnboarding.create({
      data: {
        organizationId: orgId,
        trackingCode,
        expiresAt,
        status: 'pending',
      },
    })

    // Build onboarding URL
    // Doc: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/embedded-signup
    const onboardingUrl = new URL('https://www.facebook.com/dialog/oauth')
    const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID
    const metaConfigId = process.env.NEXT_PUBLIC_META_CONFIG_ID
    const appUrl = process.env.APP_URL

    if (!metaAppId || !metaConfigId || !appUrl) {
      console.error(
        '[Onboarding] Missing required env vars: NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_META_CONFIG_ID, APP_URL'
      )
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    onboardingUrl.searchParams.set('client_id', metaAppId)
    onboardingUrl.searchParams.set('redirect_uri', `${appUrl}/api/v1/whatsapp/onboarding/callback`)
    onboardingUrl.searchParams.set('state', trackingCode) // Pass tracking code back to track origin
    onboardingUrl.searchParams.set('scope', 'whatsapp_business_management,business_management')
    onboardingUrl.searchParams.set('response_type', 'code')
    onboardingUrl.searchParams.set('config_id', metaConfigId)

    console.log(`[Onboarding] Generated URL for org ${orgId}, tracking: ${trackingCode}`)

    return NextResponse.json({
      onboardingUrl: onboardingUrl.toString(),
      trackingCode,
      expiresIn: 86400,
    })
  } catch (error) {
    console.error('[Onboarding] Error generating URL', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
