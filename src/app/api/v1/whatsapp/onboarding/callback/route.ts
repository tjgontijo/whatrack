import { prisma } from '@/lib/prisma';
import { encryption } from '@/lib/encryption';
import { WebhookProcessor } from '@/services/whatsapp/webhook-processor';

/**
 * GET /api/v1/whatsapp/onboarding/callback
 *
 * OAuth callback from Meta Embedded Signup
 *
 * Query Params:
 * - code: OAuth authorization code
 * - state: tracking code (sent in original request)
 * - error: error code if denied
 * - error_description: error details
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // trackingCode
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log(`[Onboarding Callback] Recebido: state=${state}, hasCode=${!!code}, error=${error}`);

    // Check for OAuth errors
    if (error) {
      const errorMsg = `${error}: ${errorDescription || 'Unknown error'}`;
      console.error(`[Onboarding Callback] OAuth error: ${errorMsg}`);

      // Marcar onboarding como falho
      if (state) {
        await prisma.whatsAppOnboarding.updateMany({
          where: { trackingCode: state },
          data: {
            status: 'failed',
            errorMessage: errorMsg,
            errorCode: error,
          },
        }).catch(() => {});
      }

      // Redirect back to settings with error
      return Response.redirect(
        `${process.env.APP_URL}/dashboard/settings/whatsapp?error=${encodeURIComponent(errorMsg)}`
      );
    }

    // Check if we have authorization code
    if (!code || !state) {
      const msg = 'Missing code or state in callback';
      console.error(`[Onboarding Callback] ${msg}`);
      return Response.redirect(
        `${process.env.APP_URL}/dashboard/settings/whatsapp?error=${encodeURIComponent(msg)}`
      );
    }

    // Find onboarding record
    const onboarding = await prisma.whatsAppOnboarding.findUnique({
      where: { trackingCode: state },
      include: { organization: true },
    });

    if (!onboarding) {
      const msg = 'Onboarding session not found or expired';
      console.error(`[Onboarding Callback] ${msg}`);
      return Response.redirect(
        `${process.env.APP_URL}/dashboard/settings/whatsapp?error=${encodeURIComponent(msg)}`
      );
    }

    // Check expiration
    if (onboarding.expiresAt < new Date()) {
      const msg = 'Onboarding session expired';
      console.warn(`[Onboarding Callback] ${msg}`);
      await prisma.whatsAppOnboarding.update({
        where: { id: onboarding.id },
        data: { status: 'expired' },
      });
      return Response.redirect(
        `${process.env.APP_URL}/dashboard/settings/whatsapp?error=${encodeURIComponent(msg)}`
      );
    }

    // Exchange code for access token
    console.log(`[Onboarding Callback] Exchanging code for token...`);
    const tokenResponse = await fetch('https://graph.instagram.com/v24.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        redirect_uri: `${process.env.APP_URL}/api/v1/whatsapp/onboarding/callback`,
        code,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      const msg = `Failed to get access token: ${tokenData.error?.message || 'Unknown error'}`;
      console.error(`[Onboarding Callback] ${msg}`);
      await prisma.whatsAppOnboarding.update({
        where: { id: onboarding.id },
        data: {
          status: 'failed',
          errorMessage: msg,
        },
      });
      return Response.redirect(
        `${process.env.APP_URL}/dashboard/settings/whatsapp?error=${encodeURIComponent(msg)}`
      );
    }

    const accessToken = tokenData.access_token;
    console.log(`[Onboarding Callback] Token received, updating onboarding...`);

    // Mark onboarding as authorized (token will be stored in webhook handler)
    await prisma.whatsAppOnboarding.update({
      where: { id: onboarding.id },
      data: {
        status: 'authorized',
        authorizationCode: code,
        authorizedAt: new Date(),
      },
    });

    console.log(`[Onboarding Callback] Onboarding authorized for org ${onboarding.organizationId}`);

    // Redirect back to settings with success
    return Response.redirect(
      `${process.env.APP_URL}/dashboard/settings/whatsapp?success=true&tracking=${state}`
    );
  } catch (error) {
    console.error('[Onboarding Callback] Error', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return Response.redirect(
      `${process.env.APP_URL}/dashboard/settings/whatsapp?error=${encodeURIComponent(msg)}`
    );
  }
}
