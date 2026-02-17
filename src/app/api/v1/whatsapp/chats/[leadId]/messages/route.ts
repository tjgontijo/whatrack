import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/whatsapp/chats/[conversationId]/messages
 *
 * Returns paginated message history for a specific conversation.
 * Accepts either conversationId or leadId (for backwards compatibility).
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ leadId: string }> }
) {
    try {
        const params = await props.params
        const conversationIdOrLeadId = params.leadId

        const access = await validateFullAccess(request)
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
        }
        const organizationId = access.organizationId

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
        const skip = (page - 1) * pageSize

        // Try to find by conversationId first, then by leadId for backwards compatibility
        let conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationIdOrLeadId,
                lead: {
                    organizationId
                }
            },
            select: { id: true, leadId: true }
        })

        // Fallback: if not found as conversation, try as leadId
        if (!conversation) {
            const lead = await prisma.lead.findFirst({
                where: {
                    id: conversationIdOrLeadId,
                    organizationId
                },
                select: { id: true, conversations: { select: { id: true, leadId: true }, take: 1 } }
            })

            if (!lead) {
                return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
            }

            conversation = lead.conversations[0]
            if (!conversation) {
                return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
            }
        }

        const leadId = conversation.leadId

        // Fetch messages
        const [items, total] = await Promise.all([
            prisma.message.findMany({
                where: { leadId },
                orderBy: { timestamp: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.message.count({ where: { leadId } })
        ])

        return NextResponse.json({
            items: items.reverse(), // Reverse to show in chronological order on UI
            total,
            page,
            pageSize
        })

    } catch (error) {
        console.error('[api/whatsapp/chats/messages] GET error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
