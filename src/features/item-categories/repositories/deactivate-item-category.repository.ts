import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function deactivateItemCategoryRepository(categoryId: string) {
  await prisma.itemCategory.update({ where: { id: categoryId }, data: { active: false } })
}
