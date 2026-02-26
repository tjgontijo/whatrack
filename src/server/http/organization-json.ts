import { NextResponse } from 'next/server'

export function organizationJson(
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return NextResponse.json(body, init)
}
