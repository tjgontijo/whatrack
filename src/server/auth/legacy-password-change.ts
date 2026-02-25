import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth/auth'

const CHANGE_PASSWORD_SUCCESSOR_PATH = '/api/v1/auth/change-password'
const CHANGE_PASSWORD_SUNSET = 'Fri, 27 Mar 2026 00:00:00 GMT'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must have at least 8 characters'),
  revokeOtherSessions: z.boolean().optional(),
})

function applyLegacyPasswordHeaders(response: NextResponse): NextResponse {
  response.headers.set('Deprecation', 'true')
  response.headers.set('Sunset', CHANGE_PASSWORD_SUNSET)
  response.headers.set(
    'Link',
    `<${CHANGE_PASSWORD_SUCCESSOR_PATH}>; rel="successor-version"`
  )
  return response
}

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

export async function handleLegacyPasswordChange(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return applyLegacyPasswordHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  const body = await request.json().catch(() => null)
  const parsedBody = changePasswordSchema.safeParse(body)
  if (!parsedBody.success) {
    return applyLegacyPasswordHeaders(
      NextResponse.json(
        {
          error: 'Dados inválidos para alteração de senha.',
          issues: parsedBody.error.flatten(),
        },
        { status: 400 }
      )
    )
  }

  try {
    const result = (await auth.api.changePassword({
      headers: request.headers,
      body: parsedBody.data,
    })) as { token?: string | null }

    return applyLegacyPasswordHeaders(
      NextResponse.json({
        success: true,
        token: result?.token ?? null,
      })
    )
  } catch (error) {
    console.error('[legacy-password-change] failed', error)
    return applyLegacyPasswordHeaders(
      NextResponse.json(
        { error: errorMessageFromUnknown(error) },
        { status: errorStatusFromUnknown(error) }
      )
    )
  }
}
