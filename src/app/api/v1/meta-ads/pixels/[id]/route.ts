import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { deleteMetaPixel, updateMetaPixel } from '@/services/meta-ads/meta-pixel.service'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const result = await updateMetaPixel({
      organizationId: access.organizationId,
      routeId: id,
      isActive: body.isActive,
      name: body.name,
      pixelId: body.pixelId,
      capiToken: body.capiToken,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update pixel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const result = await deleteMetaPixel({
      organizationId: access.organizationId,
      routeId: id,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete pixel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
