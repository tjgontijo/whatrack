import { NextResponse } from 'next/server'
import { getPublicInvitation } from '@/features/organizations/services/organization-invitations.service'
import { apiError } from '@/lib/utils/api-response'

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
