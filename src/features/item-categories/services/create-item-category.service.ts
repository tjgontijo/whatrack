import 'server-only'

import { createItemCategoryRepository } from '@/features/item-categories/repositories'

import { createItemCategorySchema } from '@/features/item-categories/schemas/item-category.schemas'
import { toItemCategoryListItem } from '@/features/item-categories/services/shared'
import type { ItemCategoryListItem } from '@/features/item-categories/types'
import {
  ensureProjectBelongsToOrganization,
  resolveProjectScope,
} from '@/server/project/project-scope'

export async function createItemCategoryService(input: {
  organizationId: string
  payload: unknown
}): Promise<ItemCategoryListItem> {
  const parsed = createItemCategorySchema.parse(input.payload)
  const projectId = await resolveProjectScope({
    organizationId: input.organizationId,
    projectId: parsed.projectId,
  })

  if (projectId) {
    const project = await ensureProjectBelongsToOrganization(input.organizationId, projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  const created = await createItemCategoryRepository({
    organizationId: input.organizationId,
    projectId,
    name: parsed.name,
  })

  return toItemCategoryListItem(created)
}
