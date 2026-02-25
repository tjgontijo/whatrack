import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { prisma } from '@/lib/db/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { itemId } = await params

  try {
    // Verify item belongs to organization
    const existing = await prisma.item.findFirst({
      where: {
        id: itemId,
        organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    // Toggle active status
    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        active: !existing.active,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/items/[itemId]/active] PATCH error:', error)
    return apiError('Falha ao alterar status do item', 500, error)
  }
}
