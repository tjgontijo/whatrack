import 'server-only'
import { prisma } from '@/lib/db/prisma'
import type { CategorySummary } from '@/features/item-categories/types'

export async function updateItemCategoryRepository(input: {
  categoryId: string
  name?: string
  active?: boolean
  projectId?: string | null
}): Promise<CategorySummary> {
  const updated = await prisma.itemCategory.update({
    where: { id: input.categoryId },
    data: {
      name: input.name?.trim(),
      active: input.active,
      ...(typeof input.projectId !== 'undefined' ? { projectId: input.projectId } : {}),
    },
    select: {
      id: true,
      name: true,
      active: true,
      projectId: true,
      project: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  })

  return {
    id: updated.id,
    name: updated.name,
    active: updated.active,
    itemsCount: updated._count.items,
    projectId: updated.projectId,
    projectName: updated.project?.name ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  }
}
