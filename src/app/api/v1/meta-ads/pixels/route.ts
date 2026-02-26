import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createMetaPixel, listMetaPixels } from '@/services/meta-ads/meta-pixel.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:integrations')
  const requestedOrganizationId = new URL(req.url).searchParams.get('organizationId')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  if (requestedOrganizationId && requestedOrganizationId !== access.organizationId) {
    return apiError('Forbidden for requested organization', 403)
  }

  const pixels = await listMetaPixels(access.organizationId)
  return NextResponse.json(pixels)
}

export async function POST(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:integrations')

  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Unauthorized', 401)
  }

  try {
    const body = await req.json()
    const scopedOrganizationId = body.organizationId ?? access.organizationId

    if (!scopedOrganizationId) {
      return apiError('Missing required fields', 400)
    }

    if (scopedOrganizationId !== access.organizationId) {
      return apiError('Forbidden for requested organization', 403)
    }

    const pixel = await createMetaPixel({
      organizationId: access.organizationId,
      pixelId: body.pixelId,
      capiToken: body.capiToken,
      name: body.name,
    })

    return NextResponse.json(pixel)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create pixel'
    return apiError(message, 500, error)
  }
}
