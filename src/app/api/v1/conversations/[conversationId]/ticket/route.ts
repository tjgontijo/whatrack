import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { getConversationOpenTicket } from '@/services/conversations/conversation-ticket.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const access = await validatePermissionAccess(request, 'view:tickets')

    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await params
    const result = await getConversationOpenTicket({
      organizationId: access.organizationId,
      conversationId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    console.error('[Conversation Ticket] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
  }
}
