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

export async function GET(req: NextRequest) {
    const session = await getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const sync = searchParams.get('sync') === 'true';

    if (!session || !organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sync) {
        const connections = await prisma.metaConnection.findMany({
            where: { organizationId, status: 'ACTIVE' }
        });
        for (const conn of connections) {
            await metaAdAccountService.syncAdAccounts(conn.id);
        }
    }

    const accounts = await prisma.metaAdAccount.findMany({
        where: { organizationId },
        include: { pixels: true },
        orderBy: { adAccountName: 'asc' }
    });

    return NextResponse.json(accounts);
}
