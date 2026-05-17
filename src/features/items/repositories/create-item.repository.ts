import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function createItemRepository(input: {
  organizationId: string
  projectId?: string | null
  name: string
  categoryId?: string | null
}) {
  return prisma.item.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      name: input.name.trim(),
      categoryId: input.categoryId ?? undefined,
      active: true,
    },
    select: {
      id: true,
      name: true,
      active: true,
      projectId: true,
      project: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
    },
  })
}
