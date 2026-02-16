import { prisma } from '@/lib/prisma';
import { createId } from '@paralleldrive/cuid2';

/**
 * GET /api/v1/whatsapp/onboarding
 *
 * Generate onboarding URL for Embedded Signup flow
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
export async function GET(request: Request) {
  try {
    // Get organization from query
    const url = new URL(request.url);
    const orgId = url.searchParams.get('organizationId');

    if (!orgId) {
      return Response.json({ error: 'organizationId required' }, { status: 400 });
    }

    // Generate tracking code
    const trackingCode = createId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create onboarding record
    const onboarding = await prisma.whatsAppOnboarding.create({
      data: {
        organizationId: orgId,
        trackingCode,
        expiresAt,
        status: 'pending',
      },
    });

    // Build onboarding URL
    // Doc: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/embedded-signup
    const onboardingUrl = new URL('https://www.facebook.com/dialog/oauth');
    onboardingUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_META_APP_ID || '');
    onboardingUrl.searchParams.set('redirect_uri', `${process.env.APP_URL}/api/v1/whatsapp/onboarding/callback`);
    onboardingUrl.searchParams.set('state', trackingCode); // Pass tracking code back to track origin
    onboardingUrl.searchParams.set('scope', 'whatsapp_business_management,business_management');
    onboardingUrl.searchParams.set('response_type', 'code');
    onboardingUrl.searchParams.set('config_id', process.env.NEXT_PUBLIC_META_CONFIG_ID || '');

    console.log(`[Onboarding] Generated URL for org ${orgId}, tracking: ${trackingCode}`);

    return Response.json({
      onboardingUrl: onboardingUrl.toString(),
      trackingCode,
      expiresIn: 86400,
    });
  } catch (error) {
    console.error('[Onboarding] Error generating URL', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
