import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'system:read_logs')
    if (user instanceof NextResponse) return user

    const [resourceRows, organizations] = await Promise.all([
      prisma.orgAuditLog.findMany({
        distinct: ['resourceType'],
        select: { resourceType: true },
        orderBy: { resourceType: 'asc' },
      }),
      prisma.organization.findMany({
        where: {
          orgAuditLogs: {
            some: {},
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ])

    return NextResponse.json({
      resourceTypes: resourceRows
        .map((item) => item.resourceType)
        .filter((resourceType): resourceType is string => Boolean(resourceType)),
      organizations,
    })
  } catch (error) {
    console.error('[system/audit-logs/filters] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit log filters' }, { status: 500 })
  }
}
