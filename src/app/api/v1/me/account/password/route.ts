import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth/auth'

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Implement password change logic in better-auth server integration.
  // const body = await request.json()
  // const { currentPassword, newPassword } = body
  // await auth.api.changePassword({ userId: session.user.id, currentPassword, newPassword })

  return NextResponse.json({ success: true })
}

export async function PUT(request: NextRequest) {
  return PATCH(request)
}
