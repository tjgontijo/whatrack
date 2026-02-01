import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

import { requireSuperAdmin } from '@/lib/auth/guards'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const user = await requireSuperAdmin(request)

        if (user instanceof NextResponse) return user

        const logs = await prisma.whatsAppWebhookLog.findMany({
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
        })

        return NextResponse.json({ logs })
    } catch (error) {
        console.error('[whatsapp/webhook/logs] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }
}
