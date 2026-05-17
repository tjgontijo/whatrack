import 'server-only'

import { ensureProjectBelongsToOrganization, resolveProjectScope } from '@/server/project/project-scope'

import { updateItemSchema } from '@/features/items/schemas/item.schemas'
import {
  findItemSummaryRepository,
  updateItemRepository,
} from '@/features/items/repositories'
import type { ItemSummary, NotFoundError } from '@/features/items/types'

export async function updateItemService(input: {
  organizationId: string
  itemId: string
  payload: unknown
}): Promise<ItemSummary | NotFoundError> {
  const existing = await findItemSummaryRepository({
    organizationId: input.organizationId,
    itemId: input.itemId,
  })

  if (!existing) {
    return { error: 'Item não encontrado', status: 404 }
  }

  const parsed = updateItemSchema.parse(input.payload)
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

  return updateItemRepository({
    itemId: input.itemId,
    name: parsed.name,
    categoryId: parsed.categoryId,
    active: parsed.active,
    projectId,
  })
}
