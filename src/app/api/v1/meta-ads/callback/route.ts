import { NextRequest, NextResponse } from "next/server";
import { metaAccessTokenService } from "@/services/meta-ads/access-token.service";
import { metaAdAccountService } from "@/services/meta-ads/ad-account.service";
import { getRedis } from "@/lib/redis";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateToken = searchParams.get('state');

    if (!code || !stateToken) {
        return NextResponse.redirect(new URL('/dashboard/settings/meta-ads?error=meta_auth_failed', req.url));
    }

    // Validate and consume the OAuth state token from Redis (single-use, CSRF protection)
    const redis = getRedis();
    const stateKey = `oauth_state:${stateToken}`;
    const stateRaw = await redis.get(stateKey);

    if (!stateRaw) {
        console.error('[MetaCallback] Invalid or expired OAuth state token');
        return NextResponse.redirect(new URL('/dashboard/settings/meta-ads?error=meta_auth_invalid_state', req.url));
    }

    // Delete immediately — single-use token
    await redis.del(stateKey);

    let organizationId: string;
    try {
        const stateData = JSON.parse(stateRaw) as { organizationId: string; userId: string };
        organizationId = stateData.organizationId;
    } catch {
        console.error('[MetaCallback] Failed to parse OAuth state data');
        return NextResponse.redirect(new URL('/dashboard/settings/meta-ads?error=meta_auth_failed', req.url));
    }

    try {
        // 1. Exchange code for short-lived token
        const shortLivedToken = await metaAccessTokenService.getShortLivedToken(code);

        // 2. Exchange for long-lived, debug token, and save connection
        const connection = await metaAccessTokenService.upsertConnection(organizationId, shortLivedToken);

        // 3. Initial sync of ad accounts
        await metaAdAccountService.syncAdAccounts(connection.id);

        // 4. Redirect to success page (which closes the popup)
        return NextResponse.redirect(new URL(`/auth/meta-ads/success`, req.url));

    } catch (error: any) {
        console.error('[MetaCallback] Error:', error?.response?.data || error.message);
        return NextResponse.redirect(new URL('/dashboard/settings/meta-ads?error=meta_callback_error', req.url));
    }
}
