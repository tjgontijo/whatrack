import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:integrations')
  const { searchParams } = new URL(req.url)
  const requestedTeamId = searchParams.get('teamId') ?? searchParams.get('organizationId')

  if (!access.hasAccess || !access.teamId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  if (requestedTeamId && requestedTeamId !== access.teamId) {
    return NextResponse.json({ error: 'Forbidden for requested team' }, { status: 403 })
  }

  const connections = await prisma.metaConnection.findMany({
    where: { organizationId: access.teamId },
    select: {
      id: true,
      fbUserId: true,
      fbUserName: true,
      status: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(connections)
}

export async function DELETE(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!access.hasAccess || !access.teamId || !access.userId || !id) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const connection = await prisma.metaConnection.findUnique({
    where: { id },
    select: { organizationId: true, fbUserId: true, fbUserName: true, status: true },
  })

  if (!connection || connection.organizationId !== access.teamId) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  await prisma.metaConnection.delete({ where: { id } })

  void auditService.log({
    organizationId: connection.organizationId,
    userId: access.userId,
    action: 'meta_ads.disconnected',
    resourceType: 'meta_connection',
    resourceId: id,
    before: {
      fbUserId: connection.fbUserId,
      fbUserName: connection.fbUserName,
      status: connection.status,
    },
  })

  return NextResponse.json({ success: true })
}
