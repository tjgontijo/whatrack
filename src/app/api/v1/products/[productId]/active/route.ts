import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { productId } = await params

  try {
    // Verify product belongs to organization
    const existing = await prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Toggle active status
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        active: !existing.active,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/products/[productId]/active] PATCH error:', error)
    return NextResponse.json(
      { error: 'Falha ao alterar status do produto', details: String(error) },
      { status: 500 }
    )
  }
}
