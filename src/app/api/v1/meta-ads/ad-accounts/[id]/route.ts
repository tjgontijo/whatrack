import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { metaAdAccountService } from "@/services/meta-ads/ad-account.service";

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

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSessionFromRequest(req);
    const { id } = await params;

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { isActive } = body;

    let updated: any;

    if (typeof isActive === 'boolean') {
        updated = await prisma.metaAdAccount.update({
            where: { id },
            data: { isActive }
        });
    }

    return NextResponse.json(updated || {});
}
