import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.session?.activeOrganizationId) {
        return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const organizationId = session.session.activeOrganizationId
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const skip = (page - 1) * pageSize
    const action = searchParams.get('action') || undefined
    const resourceType = searchParams.get('resourceType') || undefined

    const where = {
        organizationId,
        ...(action && { action }),
        ...(resourceType && { resourceType }),
    }

    const [logs, total] = await Promise.all([
        prisma.orgAuditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        }),
        prisma.orgAuditLog.count({ where }),
    ])

    return NextResponse.json({
        data: logs,
        total,
        page,
        pageSize,
    })
}
