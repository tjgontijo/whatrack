import 'server-only'

import { Prisma } from '@generated/prisma/client'

import { ensureProjectBelongsToOrganization, resolveProjectScope } from '@/server/project/project-scope'

import { updateItemCategorySchema } from '@/features/item-categories/schemas/item-category.schemas'
import {
  findItemCategorySummaryRepository,
  updateItemCategoryRepository,
} from '@/features/item-categories/repositories/item-category.repository'
import type {
  CategoryConflictError,
  CategoryNotFoundError,
  CategorySummary,
} from '@/features/item-categories/types'

export async function updateItemCategoryService(input: {
  organizationId: string
  categoryId: string
  payload: unknown
}): Promise<CategorySummary | CategoryNotFoundError | CategoryConflictError> {
  const existing = await findItemCategorySummaryRepository({
    organizationId: input.organizationId,
    categoryId: input.categoryId,
  })

  if (!existing) {
    return { error: 'Categoria não encontrada', status: 404 }
  }

  const parsed = updateItemCategorySchema.parse(input.payload)
  const projectId =
    typeof parsed.projectId !== 'undefined'
      ? await resolveProjectScope({
          organizationId: input.organizationId,
          projectId: parsed.projectId,
        })
      : undefined

  if (projectId) {
    const project = await ensureProjectBelongsToOrganization(input.organizationId, projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  try {
    return await updateItemCategoryRepository({
      categoryId: input.categoryId,
      name: parsed.name,
      active: parsed.active,
      projectId,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'Já existe uma categoria com este nome', status: 409 }
    }

    throw error
  }
}
