import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function deleteItemRepository(itemId: string) {
  await prisma.item.delete({ where: { id: itemId } })
}
