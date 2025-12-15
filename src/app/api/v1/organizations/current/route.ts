/**
 * API Routes - /api/v1/organizations/current
 *
 * GET - Get current user's organization
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSyncUser } from "@/lib/auth/server";

export async function GET(request: Request) {
  try {
    const user = await getOrSyncUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obter a primeira organização do usuário
    const member = await prisma.member.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        organization: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: member.organization.id,
        name: member.organization.name,
        slug: member.organization.slug,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to get current organization:", error);
    return NextResponse.json(
      { error: "Failed to get organization" },
      { status: 500 }
    );
  }
}
