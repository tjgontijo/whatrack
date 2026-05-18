import type { NextRequest } from 'next/server'
import {
  metaPixelUpdateBodySchema,
  metaRouteParamsSchema,
} from '@/features/meta-ads/schemas/meta-ads-schemas'
import { deleteMetaPixel, updateMetaPixel } from '@/features/meta-ads/services/meta-pixel.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  try {
    const parsedParams = metaRouteParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsedParams.error.flatten(),
      })
    }

    const parsedBody = metaPixelUpdateBodySchema.safeParse(await req.json())
    if (!parsedBody.success) {
      return apiError('Body inválido', 400, undefined, {
        details: parsedBody.error.flatten(),
      })
    }

    const result = await updateMetaPixel({
      organizationId: access.organizationId,
      routeId: parsedParams.data.id,
      ...parsedBody.data,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return apiSuccess(result.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update pixel'
    return apiError(message, 500, error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  try {
    const parsedParams = metaRouteParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsedParams.error.flatten(),
      })
    }

    const result = await deleteMetaPixel({
      organizationId: access.organizationId,
      routeId: parsedParams.data.id,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return apiSuccess({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete pixel'
    return apiError(message, 500, error)
  }
}
