import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit-log"

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

  const organizationId = session.session.activeOrganizationId
  const body = await req.json()
  const { name } = body

  const before = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  })

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { name },
  })

  await createAuditLog({
    organizationId,
    userId: session.user.id,
    action: 'organization.updated',
    resourceType: 'organization',
    resourceId: organizationId,
    before: before ? { name: before.name } : undefined,
    after: { name: updated.name },
  })

  return NextResponse.json(updated)
}
