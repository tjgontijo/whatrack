import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { resendProvider } from "@/services/mail/resend"
import { generateInvitationEmail } from "@/services/mail/templates/InvitationEmail"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.session?.activeOrganizationId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const organizationId = session.session.activeOrganizationId

  const body = await req.json()
  const { email, role } = body

  const [invitation, organization] = await Promise.all([
    prisma.invitation.create({
      data: {
        email,
        role,
        status: "pending",
        organizationId,
        inviterId: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
  ])

  // Send invitation email (failure does not revert invitation creation)
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const acceptUrl = `${appUrl}/sign-in?invitationId=${invitation.id}`

  try {
    const emailContent = await generateInvitationEmail({
      inviterName: session.user.name || session.user.email,
      organizationName: organization?.name || 'nossa organização',
      acceptUrl,
      expiresInDays: 7,
    })

    await resendProvider.send({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })
  } catch (emailError) {
    console.error('[Invitations] Failed to send invitation email:', emailError)
    // Intentionally not throwing — invitation persists even if email fails
  }

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
