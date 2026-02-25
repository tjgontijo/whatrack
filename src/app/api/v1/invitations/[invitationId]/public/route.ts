import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 })
  }

  return NextResponse.json(
    {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role || 'user',
      expiresAt: invitation.expiresAt,
      organizationName: invitation.organization.name,
    },
    { status: 200 }
  )
}
