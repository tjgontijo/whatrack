import { NextResponse } from 'next/server'

export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}),
    },
    { status }
  )
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}
