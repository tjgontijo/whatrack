import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

async function getSessionFromRequest(req: NextRequest) {
    const headers = new Headers(req.headers);
    if (!headers.get('cookie')) {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore
            .getAll()
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join('; ');
        if (cookieHeader) headers.set('cookie', cookieHeader)
    }
    return auth.api.getSession({ headers });
}

export async function GET(req: NextRequest) {
    const session = await getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!session || !organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await prisma.metaConnection.findMany({
        where: { organizationId },
        select: {
            id: true,
            fbUserId: true,
            fbUserName: true,
            status: true,
            updatedAt: true,
        }
    });

    return NextResponse.json(connections);
}

export async function DELETE(req: NextRequest) {
    const session = await getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!session || !id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.metaConnection.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
}
