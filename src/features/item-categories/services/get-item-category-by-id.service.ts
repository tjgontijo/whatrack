import 'server-only'

import { getItemCategoryByIdRepository } from '@/features/item-categories/repositories/item-category.repository'

export async function getItemCategoryByIdService(input: {
  organizationId: string
  categoryId: string
}) {
  return getItemCategoryByIdRepository(input)
}
