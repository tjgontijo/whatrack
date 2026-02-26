import { NextResponse } from 'next/server'

export function apiError(
  message: string | undefined,
  status: number | undefined,
  details?: unknown,
  extra?: Record<string, unknown>
) {
  const resolvedMessage =
    typeof message === 'string' && message.length > 0 ? message : 'Internal server error'
  const resolvedStatus = typeof status === 'number' ? status : 500

  return NextResponse.json(
    {
      error: resolvedMessage,
      ...(extra ?? {}),
      ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}),
    },
    { status: resolvedStatus }
  )
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}
