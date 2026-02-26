import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { updateItemCategorySchema } from '@/schemas/item-category-schemas'
import {
  deleteItemCategory,
  getItemCategoryById,
  updateItemCategory,
} from '@/services/item-categories/item-category.service'

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
    const category = await getItemCategoryById({ organizationId, categoryId })
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
    const validated = updateItemCategorySchema.parse(body)

    const updated = await updateItemCategory({
      organizationId,
      categoryId,
      name: validated.name,
      active: validated.active,
    })

    if ('error' in updated) {
      return NextResponse.json({ error: updated.error }, { status: updated.status })
    }

    return NextResponse.json(updated)
  } catch (error) {
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
    const result = await deleteItemCategory({
      organizationId,
      categoryId,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/item-categories/[categoryId]] DELETE error:', error)
    return apiError('Falha ao excluir categoria', 500, error)
  }
}
