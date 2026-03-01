import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listWhatsAppPhoneNumbers } from '@/services/whatsapp/whatsapp-config.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      const isUnauthenticated = access.error === 'Usuário não autenticado'
      return apiError(access.error || 'Acesso negado', isUnauthenticated ? 401 : 403)
    }

    const result = await listWhatsAppPhoneNumbers(access.organizationId)
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch phone numbers'
    logger.error({ err: error }, '[API] List Phone Numbers Error')
    return apiError(message, 500, error)
  }
}
