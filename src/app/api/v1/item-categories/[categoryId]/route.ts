import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import { updateItemCategorySchema } from '@/schemas/items/item-category-schemas'
import {
  deleteItemCategory,
  getItemCategoryById,
  updateItemCategory,
} from '@/services/item-categories/item-category.service'
import { logger } from '@/lib/utils/logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }
  const organizationId = access.organizationId
  const { categoryId } = await params

  try {
    const category = await getItemCategoryById({ organizationId, categoryId })
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
  const organizationId = access.organizationId
  const { categoryId } = await params

  try {
    const body = await req.json()
    const validated = updateItemCategorySchema.parse(body)
    const projectId =
      typeof validated.projectId !== 'undefined'
        ? await resolveProjectScope({
            organizationId,
            projectId: validated.projectId,
          })
        : undefined

    const updated = await updateItemCategory({
      organizationId,
      categoryId,
      name: validated.name,
      active: validated.active,
      projectId,
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
  const organizationId = access.organizationId
  const { categoryId } = await params

  try {
    const result = await deleteItemCategory({
      organizationId,
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
