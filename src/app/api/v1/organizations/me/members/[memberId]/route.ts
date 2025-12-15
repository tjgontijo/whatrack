import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const { memberId } = await params

  await prisma.member.delete({
    where: {
      id: memberId,
      organizationId: session.session.activeOrganizationId,
    },
  })

  return NextResponse.json({ success: true })
}
