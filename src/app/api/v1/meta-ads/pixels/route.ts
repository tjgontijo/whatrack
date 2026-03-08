import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { metaPixelCreateBodySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createMetaPixel, listMetaPixels } from '@/services/meta-ads/meta-pixel.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:integrations')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const pixels = await listMetaPixels(access.organizationId)
  return apiSuccess(pixels)
}

export async function POST(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:integrations')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  try {
    const parsed = metaPixelCreateBodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return apiError('Missing required fields', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const pixel = await createMetaPixel({
      organizationId: access.organizationId,
      ...parsed.data,
    })

    return apiSuccess(pixel)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create pixel'
    return apiError(message, 500, error)
  }
}
