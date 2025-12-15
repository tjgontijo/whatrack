import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'


const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  active: z.boolean().optional(),
})

export async function GET(
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
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      include: {
        category: true,
        _count: {
          select: {
            saleItems: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('[api/products/[productId]] GET error:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar produto', details: String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const body = await req.json()
    const validated = updateProductSchema.parse(body)

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

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: validated.name,
        categoryId: validated.categoryId,
        price: validated.price,
        cost: validated.cost,
        active: validated.active,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/products/[productId]] PUT error:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar produto', details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
      include: {
        _count: {
          select: {
            saleItems: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Check if product is used in sales
    if (existing._count.saleItems > 0) {
      // Soft delete: set active to false instead of hard delete
      await prisma.product.update({
        where: { id: productId },
        data: { active: false },
      })

      return NextResponse.json({
        success: true,
        message: 'Produto desativado (está sendo usado em vendas)',
      })
    }

    // Hard delete if not used
    await prisma.product.delete({
      where: { id: productId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/products/[productId]] DELETE error:', error)
    return NextResponse.json(
      { error: 'Falha ao deletar produto', details: String(error) },
      { status: 500 }
    )
  }
}
