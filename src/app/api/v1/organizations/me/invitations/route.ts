import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { LimitService } from "@/services/billing"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const organizationId = session.session.activeOrganizationId

  // Verificar limite do plano (considera membros + convites pendentes)
  const limitService = new LimitService()
  const limitCheck = await limitService.checkLimit(organizationId, 'members')

  // Também contar convites pendentes como "slots ocupados"
  const pendingInvitations = await prisma.invitation.count({
    where: {
      organizationId,
      status: 'pending',
    },
  })

  const totalWithPending = limitCheck.current + pendingInvitations
  if (totalWithPending >= limitCheck.limit) {
    return NextResponse.json({
      error: `Limite de membros atingido (${limitCheck.current} membros + ${pendingInvitations} convites pendentes / ${limitCheck.limit})`,
      code: 'LIMIT_EXCEEDED',
      current: totalWithPending,
      limit: limitCheck.limit,
    }, { status: 403 })
  }

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
