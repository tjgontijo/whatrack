import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { categoryId } = await params

  try {
    const category = await prisma.itemCategory.findFirst({
      where: {
        id: categoryId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      id: category.id,
      name: category.name,
      active: category.active,
      itemsCount: category._count.items,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('[api/item-categories/[categoryId]] GET error:', error)
    return apiError('Falha ao buscar categoria', 500, error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { categoryId } = await params

  try {
    const body = await req.json()
    const validated = updateCategorySchema.parse(body)

    const existing = await prisma.itemCategory.findFirst({
      where: {
        id: categoryId,
        organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    const updated = await prisma.itemCategory.update({
      where: { id: categoryId },
      data: {
        name: validated.name?.trim(),
        active: validated.active,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      active: updated.active,
      itemsCount: updated._count.items,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma categoria com este nome' }, { status: 409 })
    }
    console.error('[api/item-categories/[categoryId]] PUT error:', error)
    return apiError('Falha ao atualizar categoria', 500, error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const { categoryId } = await params

  try {
    const existing = await prisma.itemCategory.findFirst({
      where: {
        id: categoryId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    if (existing._count.items > 0) {
      await prisma.itemCategory.update({
        where: { id: categoryId },
        data: { active: false },
      })

      return NextResponse.json({
        success: true,
        message: 'Categoria desativada (há itens vinculados)',
      })
    }

    await prisma.itemCategory.delete({
      where: { id: categoryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/item-categories/[categoryId]] DELETE error:', error)
    return apiError('Falha ao excluir categoria', 500, error)
  }
}
