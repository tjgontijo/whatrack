import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listWhatsAppPhoneNumbers } from '@/services/whatsapp/whatsapp-config.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      const isUnauthenticated = access.error === 'Usuário não autenticado'
      return NextResponse.json(
        { error: access.error || 'Acesso negado' },
        { status: isUnauthenticated ? 401 : 403 }
      )
    }

    const result = await listWhatsAppPhoneNumbers(access.organizationId)
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch phone numbers'
    console.error('[API] List Phone Numbers Error:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
