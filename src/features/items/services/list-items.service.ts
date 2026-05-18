import 'server-only'

import { listItemsRepository } from '@/features/items/repositories'

import { itemListQuerySchema } from '@/features/items/schemas/item.schemas'
import { normalizePage, normalizePageSize, toItemListItem } from '@/features/items/services/shared'
import type { ItemListResponse } from '@/features/items/types'
import { resolveProjectScope } from '@/server/project/project-scope'

export async function listItemsService(input: {
  organizationId: string
  filters: unknown
}): Promise<ItemListResponse> {
  const parsed = itemListQuerySchema.parse(input.filters)
  const page = normalizePage(parsed.page)
  const pageSize = normalizePageSize(parsed.pageSize)
  const projectId = await resolveProjectScope({
    organizationId: input.organizationId,
    projectId: parsed.projectId,
  })

  const { items, total } = await listItemsRepository({
    organizationId: input.organizationId,
    projectId,
    search: parsed.search,
    status: parsed.status,
    categoryId: parsed.categoryId,
    page,
    pageSize,
  })

  return {
    items: items.map(toItemListItem),
    total,
    page,
    pageSize,
  }
}
