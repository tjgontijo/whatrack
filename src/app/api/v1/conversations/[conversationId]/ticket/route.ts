import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { getConversationOpenTicket } from '@/services/conversations/conversation-ticket.service'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const access = await validatePermissionAccess(request, 'view:tickets')

    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const { conversationId } = await params
    const result = await getConversationOpenTicket({
      organizationId: access.organizationId,
      conversationId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    logger.error({ err: error }, '[Conversation Ticket] Error')
    return apiError('Failed to fetch ticket', 500, error)
  }
}
