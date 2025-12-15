import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.session.activeOrganizationId },
  })

  return NextResponse.json(org)
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const body = await req.json()
  const { name } = body

  const updated = await prisma.organization.update({
    where: { id: session.session.activeOrganizationId },
    data: { name },
  })

  return NextResponse.json(updated)
}
