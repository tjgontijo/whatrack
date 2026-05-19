import { type NextRequest, NextResponse } from 'next/server'
import { getConversationIntelligence } from '@/features/conversation-intelligence/services/conversation-intelligence.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const access = await validatePermissionAccess(request, 'view:deals')

    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const { conversationId } = await params

    const result = await getConversationIntelligence({
      organizationId: access.organizationId,
      conversationId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[Conversation Intelligence] Error')
    return apiError('Failed to fetch conversation intelligence', 500, error)
  }
}
