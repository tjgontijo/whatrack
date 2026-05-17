import 'server-only'

import { getItemByIdRepository } from '@/features/items/repositories/item.repository'

export async function getItemByIdService(input: {
  organizationId: string
  itemId: string
}) {
  return getItemByIdRepository(input)
}
