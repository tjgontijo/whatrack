import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { whatsappChatMessagesQuerySchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listWhatsAppChatMessages } from '@/services/whatsapp/whatsapp-chat-query.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, props: { params: Promise<{ leadId: string }> }) {
  try {
    const params = await props.params

    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const parsedQuery = whatsappChatMessagesQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    )

    if (!parsedQuery.success) {
      return apiError('Parâmetros inválidos', 400, undefined, { details: parsedQuery.error.flatten() })
    }

    const result = await listWhatsAppChatMessages({
      organizationId: access.organizationId,
      conversationIdOrLeadId: params.leadId,
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.pageSize,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[api/whatsapp/chats/messages] GET error')
    return apiError('Internal Server Error', 500, error)
  }
}
