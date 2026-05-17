import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function createItemCategoryRepository(input: {
  organizationId: string
  projectId?: string | null
  name: string
}) {
  return prisma.itemCategory.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      name: input.name.trim(),
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
    },
  })
}
