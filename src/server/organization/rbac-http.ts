import { NextResponse } from 'next/server'

import { OrganizationRbacError } from './organization-rbac.service'

export function toRbacErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof OrganizationRbacError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status }
    )
  }

  console.error('[organization-rbac] unexpected error', error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
