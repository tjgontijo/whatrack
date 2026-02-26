import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { getPublicInvitation } from '@/services/organizations/organization-invitations.service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params
  const result = await getPublicInvitation(invitationId)

  if ('error' in result) {
    return apiError(result.error, result.status)
  }

  return NextResponse.json(result, { status: 200 })
}
