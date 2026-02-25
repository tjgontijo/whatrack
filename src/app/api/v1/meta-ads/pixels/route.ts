import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:integrations')
  const { searchParams } = new URL(req.url)
  const requestedTeamId = searchParams.get('teamId') ?? searchParams.get('organizationId')

  if (!access.hasAccess || !access.teamId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  if (requestedTeamId && requestedTeamId !== access.teamId) {
    return NextResponse.json({ error: 'Forbidden for requested team' }, { status: 403 })
  }

  const pixels = await prisma.metaPixel.findMany({
    where: { organizationId: access.teamId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(pixels)
}

export async function POST(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:integrations')

  if (!access.hasAccess || !access.teamId) {
    return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { teamId, organizationId, pixelId, capiToken, name } = body

    const scopedTeamId = teamId ?? organizationId ?? access.teamId

    if (!scopedTeamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (scopedTeamId !== access.teamId) {
      return NextResponse.json({ error: 'Forbidden for requested team' }, { status: 403 })
    }

    const fallbackPixelId = pixelId || `temp_${Date.now()}`

    const pixel = await prisma.metaPixel.create({
      data: {
        organizationId: access.teamId,
        pixelId: fallbackPixelId,
        capiToken: capiToken || '',
        name,
      },
    })

    return NextResponse.json(pixel)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
