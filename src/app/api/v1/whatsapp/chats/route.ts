import { NextResponse } from 'next/server'

import { whatsappChatsQuerySchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listWhatsAppChats } from '@/services/whatsapp/whatsapp-chat-query.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }

    const searchParams = new URL(request.url).searchParams
    const parsed = whatsappChatsQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      instanceId: searchParams.get('instanceId') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const response = await listWhatsAppChats({
      organizationId: access.organizationId,
      q: parsed.data.q,
      instanceId: parsed.data.instanceId,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[api/whatsapp/chats] GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
