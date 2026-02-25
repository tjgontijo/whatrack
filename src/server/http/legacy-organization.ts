import { NextResponse } from 'next/server'

export function applyOrganizationLegacyHeaders(response: NextResponse, successorPath: string) {
  // Organization endpoints are now canonical. Keep helper for compatibility without deprecation headers.
  void successorPath
  return response
}

export function legacyOrganizationJson(
  body: unknown,
  init: ResponseInit,
  successorPath: string
): NextResponse {
  const response = NextResponse.json(body, init)
  return applyOrganizationLegacyHeaders(response, successorPath)
}
