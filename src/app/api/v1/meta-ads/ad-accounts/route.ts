import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { metaAdAccountService } from "@/services/meta-ads/ad-account.service";
import { validateFullAccess } from "@/server/auth/validate-organization-access";

export async function GET(req: NextRequest) {
    const access = await validateFullAccess(req);

    if (!access.hasAccess || !access.organizationId) {
        return NextResponse.json({ error: access.error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sync = searchParams.get('sync') === 'true';

    if (sync) {
        const connections = await prisma.metaConnection.findMany({
            where: { organizationId: access.organizationId, status: 'ACTIVE' }
        });
        for (const conn of connections) {
            await metaAdAccountService.syncAdAccounts(conn.id);
        }
    }

    const accounts = await prisma.metaAdAccount.findMany({
        where: { organizationId: access.organizationId },
        orderBy: { adAccountName: 'asc' }
    });

    return NextResponse.json(accounts);
}
