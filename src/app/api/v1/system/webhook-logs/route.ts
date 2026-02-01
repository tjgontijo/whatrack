import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

import { requireSuperAdmin } from '@/lib/auth/guards'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const user = await requireSuperAdmin(request)

        if (user instanceof NextResponse) return user

        const [logs, distinctEventTypes] = await Promise.all([
            prisma.whatsAppWebhookLog.findMany({
                include: {
                    organization: {
                        select: {
                            name: true,
                            whatsappConfig: {
                                select: {
                                    phoneId: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 50
            }),
            prisma.whatsAppWebhookLog.findMany({
                distinct: ['eventType'],
                select: {
                    eventType: true
                },
                where: {
                    eventType: { not: null }
                }
            })
        ])

        return NextResponse.json({
            logs,
            eventTypes: distinctEventTypes.map(e => e.eventType)
        })
    } catch (error) {
        console.error('[whatsapp/webhook/logs] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }
}
