import 'server-only'

import { createItemRepository } from '@/features/items/repositories'

import { createItemSchema } from '@/features/items/schemas/item.schemas'
import { toItemListItem } from '@/features/items/services/shared'
import type { ItemListItem } from '@/features/items/types'
import {
  ensureProjectBelongsToOrganization,
  resolveProjectScope,
} from '@/server/project/project-scope'

export async function createItemService(input: {
  organizationId: string
  payload: unknown
}): Promise<ItemListItem> {
  const parsed = createItemSchema.parse(input.payload)
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

  const created = await createItemRepository({
    organizationId: input.organizationId,
    projectId,
    name: parsed.name,
    categoryId: parsed.categoryId ?? null,
  })

  return toItemListItem(created)
}
