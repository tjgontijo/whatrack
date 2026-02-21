import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { auth } from "@/lib/auth/auth";

async function getSessionFromRequest(req: NextRequest) {
    const headers = new Headers(req.headers);
    if (!headers.get('cookie')) {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore
            .getAll()
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join('; ');
        if (cookieHeader) headers.set('cookie', cookieHeader);
    }
    return auth.api.getSession({ headers });
}

export async function GET(req: NextRequest) {
    const session = await getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!session || !organizationId) {
        return NextResponse.json({ error: "Unauthorized or missing organizationId" }, { status: 401 });
    }

    const clientId = process.env.META_ADS_APP_ID;
    const redirectUri = process.env.META_OAUTH_REDIRECT_URI || `${process.env.APP_URL}/api/v1/meta-ads/callback`;
    const scopes = [
        'ads_read',
        'public_profile'
    ].join(',');

    // Using state to store organizationId for the callback
    const state = organizationId;

    let authUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}&response_type=code`;

    return NextResponse.redirect(authUrl);
}
