import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/whatsapp/chats
 * 
 * Returns a list of leads with active chat history (lastMessageAt is not null)
 */
export async function GET(request: Request) {
    try {
        const access = await validateFullAccess(request)
        if (!access.hasAccess || !access.organizationId) {
            return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
        }
        const organizationId = access.organizationId

        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q') || ''

        // Find leads with interactions
        const leads = await prisma.lead.findMany({
            where: {
                organizationId,
                lastMessageAt: { not: null },
                OR: q ? [
                    { name: { contains: q, mode: 'insensitive' } },
                    { pushName: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ] : undefined
            },
            orderBy: {
                lastMessageAt: 'desc'
            },
            select: {
                id: true,
                name: true,
                pushName: true,
                phone: true,
                waId: true,
                profilePicUrl: true,
                lastMessageAt: true,
                messages: {
                    orderBy: {
                        timestamp: 'desc'
                    },
                    take: 1
                }
            }
        })

        // Format response
        const chats = leads.map(lead => ({
            id: lead.id,
            name: lead.name || lead.pushName || lead.phone,
            phone: lead.phone,
            profilePicUrl: lead.profilePicUrl,
            lastMessageAt: lead.lastMessageAt,
            lastMessage: lead.messages[0] || null
        }))

        return NextResponse.json({ items: chats })

    } catch (error) {
        console.error('[api/whatsapp/chats] GET error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
