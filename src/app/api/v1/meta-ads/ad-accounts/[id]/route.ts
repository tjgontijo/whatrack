import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import {
  metaAdAccountToggleBodySchema,
  metaRouteParamsSchema,
} from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { toggleMetaAdAccount } from '@/services/meta-ads/meta-account-query.service'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const parsedParams = metaRouteParamsSchema.safeParse(await params)
  if (!parsedParams.success) {
    return apiError('Parâmetros inválidos', 400, undefined, {
      details: parsedParams.error.flatten(),
    })
  }

  const parsedBody = metaAdAccountToggleBodySchema.safeParse(await req.json())
  if (!parsedBody.success) {
    return apiError('Body inválido', 400, undefined, {
      details: parsedBody.error.flatten(),
    })
  }

  const result = await toggleMetaAdAccount({
    organizationId: access.organizationId,
    routeId: parsedParams.data.id,
    isActive: parsedBody.data.isActive,
  })

  if ('error' in result) {
    return apiError(result.error, result.status)
  }

  return apiSuccess(result.data)
}
