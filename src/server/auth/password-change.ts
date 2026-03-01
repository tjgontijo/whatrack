import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth/auth'
import { changeMeAccountPasswordSchema } from '@/schemas/me/me-account-schemas'
import { logger } from '@/lib/utils/logger'

function errorMessageFromUnknown(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as { message?: unknown; body?: { message?: unknown } }
    if (typeof maybeError.body?.message === 'string') return maybeError.body.message
    if (typeof maybeError.message === 'string') return maybeError.message
  }
  return 'Não foi possível alterar a senha.'
}

function errorStatusFromUnknown(error: unknown): number {
  if (error && typeof error === 'object') {
    const maybeError = error as { status?: unknown }
    if (typeof maybeError.status === 'number') return maybeError.status
  }
  return 400
}

export async function handlePasswordChange(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsedBody = changeMeAccountPasswordSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: 'Dados inválidos para alteração de senha.',
        issues: parsedBody.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const result = (await auth.api.changePassword({
      headers: request.headers,
      body: parsedBody.data,
    })) as { token?: string | null }

    return NextResponse.json({
      success: true,
      token: result?.token ?? null,
    })
  } catch (error) {
    logger.error({ err: error }, '[password-change] failed')
    return NextResponse.json(
      { error: errorMessageFromUnknown(error) },
      { status: errorStatusFromUnknown(error) }
    )
  }
}
