import { NextRequest, NextResponse } from "next/server";
import { metaAccessTokenService } from "@/services/meta-ads/access-token.service";
import { metaAdAccountService } from "@/services/meta-ads/ad-account.service";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const organizationId = searchParams.get('state'); // We passed organizationId as state

    if (!code || !organizationId) {
        return NextResponse.redirect(new URL('/dashboard/settings/whatsapp?error=meta_auth_failed', req.url));
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
