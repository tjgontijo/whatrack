import { NextResponse } from 'next/server'

import { OrganizationRbacError } from './organization-rbac.service'
import { logger } from '@/lib/utils/logger'

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

  logger.error({ err: error }, '[organization-rbac] unexpected error')
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
