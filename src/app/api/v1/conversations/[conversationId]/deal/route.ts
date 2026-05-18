import { type NextRequest, NextResponse } from 'next/server'
import { getConversationOpenDeal } from '@/features/conversations/services/conversation-deal.service'
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
    const result = await getConversationOpenDeal({
      organizationId: access.organizationId,
      conversationId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    logger.error({ err: error }, '[Conversation Deal] Error')
    return apiError('Failed to fetch deal', 500, error)
  }
}
