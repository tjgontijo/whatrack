import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { z } from 'zod';
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

const insightsQuerySchema = z.object({
    organizationId: z.string().min(1),
    days: z.coerce.number().int().min(1).max(365).default(30),
});

export async function GET(req: NextRequest) {
    const session = await getSessionFromRequest(req);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = insightsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Parâmetros inválidos', details: parsed.error.flatten() }, { status: 400 });
    }
    const { organizationId, days } = parsed.data;

    const roi = await metaAdInsightsService.getROI(organizationId, days);

    return NextResponse.json(roi);
}
