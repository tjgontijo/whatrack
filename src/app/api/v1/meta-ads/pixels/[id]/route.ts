import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.metaPixel.findFirst({
    where: {
      id,
      organizationId: access.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Pixel not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { isActive, name, pixelId, capiToken } = body

    const data: Record<string, unknown> = {}
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (typeof name !== 'undefined') data.name = name
    if (typeof pixelId !== 'undefined') data.pixelId = pixelId
    if (typeof capiToken !== 'undefined') data.capiToken = capiToken

    const updated = await prisma.metaPixel.update({
      where: { id: existing.id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:integrations')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.metaPixel.findFirst({
    where: {
      id,
      organizationId: access.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Pixel not found' }, { status: 404 })
  }

  try {
    await prisma.metaPixel.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
