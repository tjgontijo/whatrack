import 'server-only'

import {
  findItemSummaryRepository,
  updateItemRepository,
} from '@/features/items/repositories/item.repository'
import type { ItemSummary, NotFoundError } from '@/features/items/types'

export async function toggleItemActiveService(input: {
  organizationId: string
  itemId: string
}): Promise<ItemSummary | NotFoundError> {
  const existing = await findItemSummaryRepository(input)

  if (!existing) {
    return { error: 'Item não encontrado', status: 404 }
  }

  return updateItemRepository({
    itemId: input.itemId,
    active: !existing.active,
  })
}
