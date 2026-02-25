import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { applyOrganizationLegacyHeaders } from '@/server/http/legacy-organization'

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session) {
    return applyOrganizationLegacyHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      '/api/v1/me/account/password'
    )
  }

  // TODO: Implement password change logic
  // const body = await req.json()
  // const { currentPassword, newPassword } = body
  // await auth.changePassword(session.user.id, currentPassword, newPassword)

  return applyOrganizationLegacyHeaders(
    NextResponse.json({ success: true }),
    '/api/v1/me/account/password'
  )
}
