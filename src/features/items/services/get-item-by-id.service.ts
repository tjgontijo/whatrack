import 'server-only'

import { getItemByIdRepository } from '@/features/items/repositories'

export async function getItemByIdService(input: { organizationId: string; itemId: string }) {
  return getItemByIdRepository(input)
}
