import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/whatsapp/chats
 *
 * Returns a list of leads with active chat history (lastMessageAt is not null).
 * Supports filtering by instance and search query.
 *
 * Query Parameters:
 * - q: Search query (name, pushName, phone)
 * - instanceId: Filter by WhatsApp instance (phone number)
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
        const instanceId = searchParams.get('instanceId')

        // Build where clause
        const where: Prisma.LeadWhereInput = {
            organizationId,
            lastMessageAt: { not: null },
            // Filter by instance if provided
            ...(instanceId && instanceId !== 'all' && {
                conversations: {
                    some: {
                        instance: {
                            id: instanceId,
                        },
                    },
                },
            }),
            // Filter by search query
            ...(q && {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { pushName: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ],
            }),
        }

        // Find leads with interactions
        const leads = await prisma.lead.findMany({
            where,
            orderBy: {
                lastMessageAt: 'desc',
            },
            select: {
                id: true,
                name: true,
                pushName: true,
                phone: true,
                waId: true,
                profilePicUrl: true,
                lastMessageAt: true,
                conversations: {
                    select: {
                        id: true,
                        tickets: {
                            where: {
                                status: 'open',
                            },
                            select: {
                                id: true,
                                status: true,
                                stage: {
                                    select: {
                                        id: true,
                                        name: true,
                                        color: true,
                                    },
                                },
                            },
                            orderBy: {
                                createdAt: 'desc',
                            },
                            take: 1,
                        },
                    },
                    take: 1,
                },
                messages: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                    take: 1,
                },
            },
        })

        // Format response
        const chats = leads.map((lead) => {
            const conversation = lead.conversations[0]
            const currentTicket = conversation?.tickets[0]

            return {
                id: lead.id,
                name: lead.name || lead.pushName || lead.phone,
                phone: lead.phone,
                profilePicUrl: lead.profilePicUrl,
                lastMessageAt: lead.lastMessageAt,
                lastMessage: lead.messages[0] || null,
                unreadCount: 0, // TODO: implement unread count tracking
                currentTicket: currentTicket
                    ? {
                        id: currentTicket.id,
                        status: currentTicket.status,
                        stage: currentTicket.stage,
                    }
                    : undefined,
            }
        })

        return NextResponse.json({ items: chats })
    } catch (error) {
        console.error('[api/whatsapp/chats] GET error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
