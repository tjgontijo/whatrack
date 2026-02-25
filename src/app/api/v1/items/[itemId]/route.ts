import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

export async function GET(
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
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
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

    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('[api/items/[itemId]] GET error:', error)
    return apiError('Falha ao buscar item', 500, error)
  }
}

export async function PUT(
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
    const body = await req.json()
    const validated = updateItemSchema.parse(body)

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

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        name: validated.name,
        categoryId: validated.categoryId,
        active: validated.active,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[api/items/[itemId]] PUT error:', error)
    return apiError('Falha ao atualizar item', 500, error)
  }
}

export async function DELETE(
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
      include: {
        _count: {
          select: {
            saleItems: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    // Check if item is used in sales
    if (existing._count.saleItems > 0) {
      // Soft delete: set active to false instead of hard delete
      await prisma.item.update({
        where: { id: itemId },
        data: { active: false },
      })

      return NextResponse.json({
        success: true,
        message: 'Item desativado (está sendo usado em vendas)',
      })
    }

    // Hard delete if not used
    await prisma.item.delete({
      where: { id: itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/items/[itemId]] DELETE error:', error)
    return apiError('Falha ao deletar item', 500, error)
  }
}
