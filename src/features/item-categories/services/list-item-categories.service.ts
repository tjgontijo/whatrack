import 'server-only'

import { resolveProjectScope } from '@/server/project/project-scope'

import { itemCategoryListQuerySchema } from '@/features/item-categories/schemas/item-category.schemas'
import { listItemCategoriesRepository } from '@/features/item-categories/repositories/item-category.repository'
import { normalizePage, normalizePageSize, toItemCategoryListItem } from '@/features/item-categories/services/shared'
import type { ItemCategoryListResponse } from '@/features/item-categories/types'

export async function listItemCategoriesService(input: {
  organizationId: string
  filters: unknown
}): Promise<ItemCategoryListResponse> {
  const parsed = itemCategoryListQuerySchema.parse(input.filters)
  const page = normalizePage(parsed.page)
  const pageSize = normalizePageSize(parsed.pageSize)
  const projectId = await resolveProjectScope({
    organizationId: input.organizationId,
    projectId: parsed.projectId,
  })

  const { items, total } = await listItemCategoriesRepository({
    organizationId: input.organizationId,
    projectId,
    search: parsed.search,
    status: parsed.status,
    page,
    pageSize,
  })

  return {
    items: items.map(toItemCategoryListItem),
    total,
    page,
    pageSize,
  }
}
