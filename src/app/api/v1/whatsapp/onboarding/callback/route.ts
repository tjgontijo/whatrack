import { prisma } from '@/lib/prisma';
import { encryption } from '@/lib/encryption';
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service';

const APP_URL = process.env.APP_URL;

/**
 * GET /api/v1/whatsapp/onboarding/callback
 *
 * OAuth callback from Meta Embedded Signup.
 * This is the main endpoint that completes the onboarding flow.
 *
 * Flow:
 * 1. Validate state (trackingCode) against database
 * 2. Exchange authorization code for access token
 * 3. Fetch shared WABAs from Meta Graph API
 * 4. For each WABA, fetch phone numbers
 * 5. Create WhatsAppConnection and WhatsAppConfig records
 * 6. Subscribe app to WABA webhooks
 * 7. Mark onboarding as completed
 * 8. Redirect to settings page with success
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // trackingCode
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log(`[Callback] Received: state=${state?.substring(0, 8)}..., hasCode=${!!code}, error=${error}`);

    // Handle OAuth errors
    if (error) {
      const errorMsg = `${error}: ${errorDescription || 'Unknown error'}`;
      console.error(`[Callback] OAuth error: ${errorMsg}`);

      if (state) {
        await prisma.whatsAppOnboarding.updateMany({
          where: { trackingCode: state },
          data: { status: 'failed', errorMessage: errorMsg, errorCode: error },
        }).catch(() => {});
      }

      return redirectToError(errorMsg);
    }

    // Validate required params
    if (!code || !state) {
      return redirectToError('Missing code or state in callback');
    }

    // 1. Validate state (trackingCode)
    const onboarding = await prisma.whatsAppOnboarding.findUnique({
      where: { trackingCode: state },
    });

    if (!onboarding) {
      console.error(`[Callback] Invalid state: ${state}`);
      return redirectToError('Invalid or expired tracking code');
    }

    if (onboarding.expiresAt < new Date()) {
      console.error(`[Callback] State expired: ${state}`);
      await prisma.whatsAppOnboarding.update({
        where: { id: onboarding.id },
        data: { status: 'expired' },
      });
      return redirectToError('Tracking code expired');
    }

    const organizationId = onboarding.organizationId;
    console.log(`[Callback] State valid for org: ${organizationId}`);

    // 2. Exchange code for access token
    let accessToken: string;
    try {
      const tokenData = await MetaCloudService.exchangeCodeForToken(code);
      accessToken = tokenData.access_token;
      console.log(`[Callback] Token exchanged successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token exchange failed';
      console.error(`[Callback] Token exchange error:`, err);
      await prisma.whatsAppOnboarding.update({
        where: { id: onboarding.id },
        data: { status: 'failed', errorMessage: msg },
      });
      return redirectToError(msg);
    }

    // 3. Fetch shared WABAs
    let wabas: Array<{ wabaId: string; wabaName: string; businessId: string }>;
    try {
      wabas = await MetaCloudService.listWabas(accessToken);
      console.log(`[Callback] Found ${wabas.length} WABAs`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to list WABAs';
      console.error(`[Callback] List WABAs error:`, err);
      await prisma.whatsAppOnboarding.update({
        where: { id: onboarding.id },
        data: { status: 'failed', errorMessage: msg },
      });
      return redirectToError(msg);
    }

    if (wabas.length === 0) {
      const msg = 'No WhatsApp Business Accounts found. Please complete the signup process.';
      console.warn(`[Callback] ${msg}`);
      await prisma.whatsAppOnboarding.update({
        where: { id: onboarding.id },
        data: { status: 'failed', errorMessage: msg },
      });
      return redirectToError(msg);
    }

    // 4. Process each WABA
    const encryptedToken = encryption.encrypt(accessToken);
    let totalPhones = 0;

    for (const waba of wabas) {
      try {
        console.log(`[Callback] Processing WABA: ${waba.wabaId}`);

        // 4a. Create WhatsAppConnection
        const connection = await prisma.whatsAppConnection.upsert({
          where: {
            organizationId_wabaId: {
              organizationId,
              wabaId: waba.wabaId,
            },
          },
          create: {
            organizationId,
            wabaId: waba.wabaId,
            ownerBusinessId: waba.businessId,
            status: 'active',
            connectedAt: new Date(),
            healthStatus: 'healthy',
          },
          update: {
            ownerBusinessId: waba.businessId,
            status: 'active',
            connectedAt: new Date(),
            healthStatus: 'healthy',
            disconnectedAt: null,
          },
        });

        console.log(`[Callback] Connection created/updated: ${connection.id}`);

        // 4b. Fetch phone numbers for this WABA
        let phones: any[] = [];
        try {
          phones = await MetaCloudService.listPhoneNumbers({
            wabaId: waba.wabaId,
            accessToken,
          });
          console.log(`[Callback] WABA ${waba.wabaId} has ${phones.length} phone numbers`);
        } catch (err) {
          console.error(`[Callback] Failed to list phones for WABA ${waba.wabaId}:`, err);
        }

        // 4c. Create WhatsAppConfig for each phone
        for (const phone of phones) {
          await prisma.whatsAppConfig.upsert({
            where: { phoneId: phone.id },
            create: {
              organizationId,
              connectionId: connection.id,
              wabaId: waba.wabaId,
              phoneId: phone.id,
              displayPhone: phone.display_phone_number,
              verifiedName: phone.verified_name,
              accessToken: encryptedToken,
              accessTokenEncrypted: true,
              status: 'connected',
              connectedAt: new Date(),
            },
            update: {
              organizationId,
              connectionId: connection.id,
              displayPhone: phone.display_phone_number,
              verifiedName: phone.verified_name,
              accessToken: encryptedToken,
              accessTokenEncrypted: true,
              status: 'connected',
              connectedAt: new Date(),
              disconnectedAt: null,
            },
          });
          totalPhones++;
        }

        // 4d. Subscribe app to WABA webhooks
        try {
          await MetaCloudService.subscribeToWaba(waba.wabaId, accessToken);
          console.log(`[Callback] Subscribed to WABA ${waba.wabaId} webhooks`);
        } catch (err) {
          console.warn(`[Callback] Failed to subscribe to WABA ${waba.wabaId}:`, err);
          // Continue anyway - webhooks can be subscribed later
        }

        // 4e. Log audit event
        await prisma.whatsAppAuditLog.create({
          data: {
            organizationId,
            connectionId: connection.id,
            action: 'ONBOARDING_COMPLETED',
            description: `WhatsApp connected: ${waba.wabaName} with ${phones.length} phone number(s)`,
            trackingCode: state,
            metadata: {
              wabaId: waba.wabaId,
              businessId: waba.businessId,
              phoneCount: phones.length,
            },
          },
        });
      } catch (wabaErr) {
        console.error(`[Callback] Error processing WABA ${waba.wabaId}:`, wabaErr);
        // Continue with other WABAs
      }
    }

    // 5. Mark onboarding as completed
    await prisma.whatsAppOnboarding.update({
      where: { id: onboarding.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        wabaId: wabas[0]?.wabaId,
        ownerBusinessId: wabas[0]?.businessId,
      },
    });

    console.log(`[Callback] ✅ Success! Org ${organizationId}, ${totalPhones} phones configured`);

    // 6. Redirect to success
    return Response.redirect(
      `${APP_URL}/dashboard/settings/whatsapp?status=success&phones=${totalPhones}`
    );

  } catch (error) {
    console.error('[Callback] Unexpected error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return redirectToError(msg);
  }
}

function redirectToError(message: string) {
  console.error(`[Callback] Redirecting to error: ${message}`);
  return Response.redirect(
    `${APP_URL}/dashboard/settings/whatsapp?status=error&message=${encodeURIComponent(message)}`
  );
}
