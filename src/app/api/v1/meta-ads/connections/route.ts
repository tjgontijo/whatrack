import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import {
  deleteMetaConnection,
  listMetaConnections,
} from '@/services/meta-ads/meta-connection.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:integrations')
  const { searchParams } = new URL(req.url)
  const requestedOrganizationId = searchParams.get('organizationId')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  if (requestedOrganizationId && requestedOrganizationId !== access.organizationId) {
    return apiError('Forbidden for requested organization', 403)
  }

  const connections = await listMetaConnections(access.organizationId)
  return NextResponse.json(connections)
}

export async function DELETE(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  const id = new URL(req.url).searchParams.get('id')

  if (!access.hasAccess || !access.organizationId || !access.userId || !id) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const result = await deleteMetaConnection({
    organizationId: access.organizationId,
    userId: access.userId,
    connectionId: id,
  })

  if ('error' in result) {
    return apiError(result.error, result.status)
  }

  return NextResponse.json({ success: true })
}
