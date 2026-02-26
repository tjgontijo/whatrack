import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { checkWhatsAppTokenHealth } from '@/services/whatsapp/whatsapp-config.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await checkWhatsAppTokenHealth(access.organizationId)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check token health'
    console.error('[API] Token Health Error:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
