import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { auth } from "@/lib/auth/auth";
import { metaAdInsightsService } from "@/services/meta-ads/ad-insights.service";

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
    const days = parseInt(searchParams.get('days') || '30');

    if (!session || !organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roi = await metaAdInsightsService.getROI(organizationId, days);

    return NextResponse.json(roi);
}
