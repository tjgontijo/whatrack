import 'server-only'

import type { Prisma } from '@generated/prisma/client'

type ListItemsRepositoryInput = {
  organizationId: string
  projectId?: string | null
  search?: string
  status?: 'active' | 'inactive'
  categoryId?: string
  page: number
  pageSize: number
}

import { prisma } from '@/lib/db/prisma'

export async function listItemsRepository(input: ListItemsRepositoryInput) {
  const where: Prisma.ItemWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  }

  if (input.search?.trim()) {
    where.name = { contains: input.search.trim(), mode: 'insensitive' }
  }
  if (input.categoryId) where.categoryId = input.categoryId
  if (input.status === 'active') where.active = true
  if (input.status === 'inactive') where.active = false

  const [items, total] = await Promise.all([
    prisma.item.findMany({
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
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.item.count({ where }),
  ])

  return { items, total }
}
