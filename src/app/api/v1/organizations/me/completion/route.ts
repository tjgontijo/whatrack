import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/server/auth/server'
import { getOrganizationIdentityStatus } from '@/server/organization/is-identity-complete'

export async function GET(request: NextRequest) {
  const session = await getServerSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const memberships = await prisma.member.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
    orderBy: { createdAt: 'asc' },
    take: 1,
  })

  const activeOrganizationId = session.session.activeOrganizationId
  const firstOrganizationId = memberships[0]?.organizationId ?? null

  const hasActiveMembership = activeOrganizationId
    ? await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: activeOrganizationId,
        },
        select: { id: true },
      })
    : null

  const organizationId =
    (hasActiveMembership ? activeOrganizationId : null) ?? firstOrganizationId ?? null

  if (!organizationId) {
    return NextResponse.json({
      hasOrganization: false,
      identityComplete: false,
      blockedModules: ['whatsapp', 'metaAds'],
    })
  }

  const identity = await getOrganizationIdentityStatus(organizationId)

  return NextResponse.json({
    hasOrganization: true,
    organizationId,
    identityComplete: identity.identityComplete,
    entityType: identity.entityType,
    blockedModules: identity.identityComplete ? [] : ['whatsapp', 'metaAds'],
  })
}
