import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { metaConnectionDeleteQuerySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import {
  deleteMetaConnection,
  listMetaConnections,
} from '@/services/meta-ads/meta-connection.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:integrations')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const connections = await listMetaConnections(access.organizationId)
  return apiSuccess(connections)
}

export async function DELETE(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:integrations')

  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const parsed = metaConnectionDeleteQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams)
  )
  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  const result = await deleteMetaConnection({
    organizationId: access.organizationId,
    userId: access.userId,
    connectionId: parsed.data.id,
  })

  if ('error' in result) {
    return apiError(result.error, result.status)
  }

  return apiSuccess({ success: true })
}
