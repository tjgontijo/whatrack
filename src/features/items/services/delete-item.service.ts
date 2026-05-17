import 'server-only'

import {
  deactivateItemRepository,
  deleteItemRepository,
  findItemDeleteContextRepository,
} from '@/features/items/repositories/item.repository'
import type { DeleteItemResult } from '@/features/items/types'

export async function deleteItemService(input: {
  organizationId: string
  itemId: string
}): Promise<DeleteItemResult> {
  const existing = await findItemDeleteContextRepository(input)

  if (!existing) {
    return { error: 'Item não encontrado', status: 404 }
  }

  if (existing._count.saleItems > 0) {
    await deactivateItemRepository(input.itemId)
    return {
      success: true,
      message: 'Item desativado (está sendo usado em vendas)',
    }
  }

  await deleteItemRepository(input.itemId)
  return { success: true }
}
