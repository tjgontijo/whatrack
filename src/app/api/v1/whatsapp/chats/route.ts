import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { whatsappChatsQuerySchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { listWhatsAppChats } from '@/services/whatsapp/whatsapp-chat-query.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Acesso negado', 403)
    }

    const searchParams = new URL(request.url).searchParams
    const parsed = whatsappChatsQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      instanceId: searchParams.get('instanceId') ?? undefined,
    })

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const response = await listWhatsAppChats({
      organizationId: access.organizationId,
      q: parsed.data.q,
      instanceId: parsed.data.instanceId,
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error({ err: error }, '[api/whatsapp/chats] GET error')
    return apiError('Internal Server Error', 500, error)
  }
}
