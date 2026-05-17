import 'server-only'

import { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import type { ItemSummary, ItemWithCategoryAndCount } from '@/features/items/types'

type ListItemsRepositoryInput = {
  organizationId: string
  projectId?: string | null
  search?: string
  status?: 'active' | 'inactive'
  categoryId?: string
  page: number
  pageSize: number
}

export async function listItemsRepository(input: ListItemsRepositoryInput) {
  const where: Prisma.ItemWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  }

  if (input.search?.trim()) {
    where.name = {
      contains: input.search.trim(),
      mode: 'insensitive',
    }
  }

  if (input.categoryId) {
    where.categoryId = input.categoryId
  }

  if (input.status === 'active') {
    where.active = true
  } else if (input.status === 'inactive') {
    where.active = false
  }

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
        project: {
          select: { id: true, name: true },
        },
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.item.count({ where }),
  ])

  return { items, total }
}

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
      project: {
        select: { id: true, name: true },
      },
      createdAt: true,
      updatedAt: true,
      category: {
        select: { id: true, name: true },
      },
    },
  })
}

export async function getItemByIdRepository(input: {
  organizationId: string
  itemId: string
}): Promise<ItemWithCategoryAndCount | null> {
  return prisma.item.findFirst({
    where: {
      id: input.itemId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      categoryId: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          organizationId: true,
          name: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      _count: {
        select: {
          saleItems: true,
        },
      },
    },
  })
}

export async function findItemSummaryRepository(input: {
  organizationId: string
  itemId: string
}): Promise<Pick<ItemSummary, 'id' | 'active'> | null> {
  return prisma.item.findFirst({
    where: {
      id: input.itemId,
      organizationId: input.organizationId,
    },
    select: { id: true, active: true },
  })
}

export async function updateItemRepository(input: {
  itemId: string
  name?: string
  categoryId?: string | null
  active?: boolean
  projectId?: string | null
}): Promise<ItemSummary> {
  return prisma.item.update({
    where: { id: input.itemId },
    data: {
      name: input.name,
      categoryId: input.categoryId,
      active: input.active,
      ...(typeof input.projectId !== 'undefined' ? { projectId: input.projectId } : {}),
    },
    select: {
      id: true,
      organizationId: true,
      categoryId: true,
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function findItemDeleteContextRepository(input: {
  organizationId: string
  itemId: string
}) {
  return prisma.item.findFirst({
    where: {
      id: input.itemId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      _count: {
        select: {
          saleItems: true,
        },
      },
    },
  })
}

export async function deactivateItemRepository(itemId: string) {
  await prisma.item.update({
    where: { id: itemId },
    data: { active: false },
  })
}

export async function deleteItemRepository(itemId: string) {
  await prisma.item.delete({
    where: { id: itemId },
  })
}
