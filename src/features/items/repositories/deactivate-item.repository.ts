import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function deactivateItemRepository(itemId: string) {
  await prisma.item.update({ where: { id: itemId }, data: { active: false } })
}
