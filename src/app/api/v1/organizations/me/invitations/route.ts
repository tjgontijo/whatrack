import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const organizationId = session.session.activeOrganizationId

  const body = await req.json()
  const { email, role } = body

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      status: "pending",
      organizationId,
      inviterId: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  })

  // TODO: Send invitation email

  return NextResponse.json(invitation)
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId: session.session.activeOrganizationId,
      status: "pending",
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  return NextResponse.json(invitations)
}
