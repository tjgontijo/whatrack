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
        if (cookieHeader) headers.set('cookie', cookieHeader);
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

    const pixels = await prisma.metaPixel.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(pixels);
}

export async function POST(req: NextRequest) {
    const session = await getSessionFromRequest(req);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { organizationId, pixelId, capiToken, name } = body;

        if (!organizationId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const fallbackPixelId = pixelId || `temp_${Date.now()}`;

        const pixel = await prisma.metaPixel.create({
            data: {
                organizationId,
                pixelId: fallbackPixelId,
                capiToken: capiToken || "",
                name,
            },
        });

        return NextResponse.json(pixel);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
