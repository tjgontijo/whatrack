import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { metaPixelCreateBodySchema } from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import { createMetaPixel, listMetaPixels } from '@/services/meta-ads/meta-pixel.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:integrations')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  const { searchParams } = new URL(req.url)
  const projectId = await resolveProjectScope({
    organizationId: access.organizationId,
    projectId: searchParams.get('projectId') ?? undefined,
  })

  if (!projectId) {
    return apiError('Project not found', 400)
  }

  const pixels = await listMetaPixels(access.organizationId, projectId)
  return apiSuccess(pixels)
}

export async function POST(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:integrations')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  try {
    const { searchParams } = new URL(req.url)
    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: searchParams.get('projectId') ?? undefined,
    })

    if (!projectId) {
      return apiError('projectId is required', 400)
    }

    const parsed = metaPixelCreateBodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return apiError('Missing required fields', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const pixel = await createMetaPixel({
      organizationId: access.organizationId,
      projectId,
      ...parsed.data,
    })

    return apiSuccess(pixel)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create pixel'
    return apiError(message, 500, error)
  }
}
