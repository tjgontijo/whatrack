import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createMetaPixel, listMetaPixels } from '@/services/meta-ads/meta-pixel.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:integrations')
  const requestedOrganizationId = new URL(req.url).searchParams.get('organizationId')

  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  if (requestedOrganizationId && requestedOrganizationId !== access.organizationId) {
    return NextResponse.json({ error: 'Forbidden for requested organization' }, { status: 403 })
  }

  const pixels = await listMetaPixels(access.organizationId)
  return NextResponse.json(pixels)
}

export async function POST(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:integrations')

  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const scopedOrganizationId = body.organizationId ?? access.organizationId

    if (!scopedOrganizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (scopedOrganizationId !== access.organizationId) {
      return NextResponse.json({ error: 'Forbidden for requested organization' }, { status: 403 })
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
