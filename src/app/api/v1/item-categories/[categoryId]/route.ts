import { type NextRequest, NextResponse } from 'next/server'
import {
  deleteItemCategoryService,
  getItemCategoryByIdService,
  updateItemCategoryService,
} from '@/features/item-categories/server'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { categoryId } = await params

  try {
    const category = await getItemCategoryByIdService({
      organizationId: access.organizationId,
      categoryId,
    })

    if (!category) {
      return apiError('Categoria não encontrada', 404)
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
    logger.error({ err: error }, '[api/item-categories/[categoryId]] GET error')
    return apiError('Falha ao buscar categoria', 500, error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { categoryId } = await params

  try {
    const payload = await req.json()
    const updated = await updateItemCategoryService({
      organizationId: access.organizationId,
      categoryId,
      payload,
    })

    if ('error' in updated) {
      return apiError(updated.error, updated.status)
    }

    return NextResponse.json(updated)
  } catch (error) {
    logger.error({ err: error }, '[api/item-categories/[categoryId]] PUT error')
    return apiError('Falha ao atualizar categoria', 500, error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { categoryId } = await params

  try {
    const result = await deleteItemCategoryService({
      organizationId: access.organizationId,
      categoryId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[api/item-categories/[categoryId]] DELETE error')
    return apiError('Falha ao excluir categoria', 500, error)
  }
}
