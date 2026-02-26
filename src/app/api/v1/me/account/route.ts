import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth/auth'
import { updateMeAccountSchema } from '@/schemas/me-account-schemas'
import { getMeAccount, updateMeAccount } from '@/services/me/me-account.service'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(await getMeAccount(session.user.id))
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateMeAccountSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updated = await updateMeAccount({
    userId: session.user.id,
    organizationId: session.session.activeOrganizationId || undefined,
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

export async function PUT(request: NextRequest) {
  return PATCH(request)
}
