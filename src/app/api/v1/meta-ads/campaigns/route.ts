import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { auth } from "@/lib/auth/auth";
import { metaCampaignsService } from "@/services/meta-ads/campaigns.service";

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
    const accountId = searchParams.get('accountId') || undefined;
    const days = parseInt(searchParams.get('days') || '30');

    if (!session || !organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const campaigns = await metaCampaignsService.getCampaigns(organizationId, { days, accountId });
        return NextResponse.json(campaigns);
    } catch (error: any) {
        console.error('[Meta Campaigns API]', error.message);
        return NextResponse.json(
            { error: "Failed to fetch campaigns", details: error.message },
            { status: 500 }
        );
    }
}
