import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit-log"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const organizationId = session.session.activeOrganizationId
  const { memberId } = await params

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId },
    select: { id: true, userId: true, role: true },
  })

  await prisma.member.delete({
    where: { id: memberId, organizationId },
  })

  await createAuditLog({
    organizationId,
    userId: session.user.id,
    action: 'member.removed',
    resourceType: 'member',
    resourceId: memberId,
    before: member ? { userId: member.userId, role: member.role } : undefined,
  })

  return NextResponse.json({ success: true })
}
