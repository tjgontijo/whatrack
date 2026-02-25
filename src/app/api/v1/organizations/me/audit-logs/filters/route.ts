import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function GET(request: NextRequest) {
  const access = await validatePermissionAccess(request, 'view:audit')
  if (!access.hasAccess || !access.teamId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const resourceRows = await prisma.orgAuditLog.findMany({
    where: { organizationId: access.teamId },
    distinct: ['resourceType'],
    select: { resourceType: true },
    orderBy: { resourceType: 'asc' },
  })

  return NextResponse.json({
    resourceTypes: resourceRows
      .map((item) => item.resourceType)
      .filter((resourceType): resourceType is string => Boolean(resourceType)),
  })
}
