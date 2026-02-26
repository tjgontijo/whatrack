import { NextRequest, NextResponse } from 'next/server'

import { whatsappChatMessagesQuerySchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listWhatsAppChatMessages } from '@/services/whatsapp/whatsapp-chat-query.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, props: { params: Promise<{ leadId: string }> }) {
  try {
    const params = await props.params

    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
    }

    const parsedQuery = whatsappChatMessagesQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    )

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsedQuery.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listWhatsAppChatMessages({
      organizationId: access.organizationId,
      conversationIdOrLeadId: params.leadId,
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.pageSize,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[api/whatsapp/chats/messages] GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
