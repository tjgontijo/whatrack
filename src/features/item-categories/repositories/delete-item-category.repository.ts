import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function deleteItemCategoryRepository(categoryId: string) {
  await prisma.itemCategory.delete({ where: { id: categoryId } })
}
