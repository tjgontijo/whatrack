import 'server-only'

import type { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

type ListItemCategoriesRepositoryInput = {
  organizationId: string
  projectId?: string | null
  search?: string
  status?: 'active' | 'inactive'
  page: number
  pageSize: number
}

export async function listItemCategoriesRepository(input: ListItemCategoriesRepositoryInput) {
  const where: Prisma.ItemCategoryWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  }

  if (input.search?.trim()) where.name = { contains: input.search.trim(), mode: 'insensitive' }
  if (input.status === 'active') where.active = true
  if (input.status === 'inactive') where.active = false

  const [items, total] = await Promise.all([
    prisma.itemCategory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
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
    }),
    prisma.itemCategory.count({ where }),
  ])

  return { items, total }
}
