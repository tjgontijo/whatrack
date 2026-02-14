import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/whatsapp/chats/[leadId]/messages
 * 
 * Returns paginated message history for a specific lead
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ leadId: string }> }
) {
    try {
        const params = await props.params
        const leadId = params.leadId

        const access = await validateFullAccess(request)
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
        }
        const organizationId = access.organizationId

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
        const skip = (page - 1) * pageSize

        // Verify lead ownership
        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                organizationId
            },
            select: { id: true }
        })

        if (!lead) {
            return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
        }

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
