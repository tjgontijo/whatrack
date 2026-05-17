import 'server-only'

import {
  deactivateItemCategoryRepository,
  deleteItemCategoryRepository,
  findItemCategoryDeleteContextRepository,
} from '@/features/item-categories/repositories'
import type { DeleteItemCategoryResult } from '@/features/item-categories/types'

export async function deleteItemCategoryService(input: {
  organizationId: string
  categoryId: string
}): Promise<DeleteItemCategoryResult> {
  const existing = await findItemCategoryDeleteContextRepository(input)

  if (!existing) {
    return { error: 'Categoria não encontrada', status: 404 }
  }

  if (existing._count.items > 0) {
    await deactivateItemCategoryRepository(input.categoryId)

    return {
      success: true,
      message: 'Categoria desativada (há itens vinculados)',
    }
  }

  await deleteItemCategoryRepository(input.categoryId)
  return { success: true }
}
