import { NextResponse } from 'next/server'

import { getPublicInvitation } from '@/services/organizations/organization-invitations.service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params
  const result = await getPublicInvitation(invitationId)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result, { status: 200 })
}
