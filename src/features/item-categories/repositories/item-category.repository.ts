import 'server-only'

import { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import type { CategorySummary, ItemCategoryWithCount } from '@/features/item-categories/types'

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

  if (input.search?.trim()) {
    where.name = {
      contains: input.search.trim(),
      mode: 'insensitive',
    }
  }

  if (input.status === 'active') {
    where.active = true
  } else if (input.status === 'inactive') {
    where.active = false
  }

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
        project: {
          select: { id: true, name: true },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
    prisma.itemCategory.count({ where }),
  ])

  return { items, total }
}

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
      project: {
        select: { id: true, name: true },
      },
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getItemCategoryByIdRepository(input: {
  organizationId: string
  categoryId: string
}): Promise<ItemCategoryWithCount | null> {
  return prisma.itemCategory.findFirst({
    where: {
      id: input.categoryId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
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
      _count: {
        select: {
          items: true,
        },
      },
    },
  })
}

export async function findItemCategorySummaryRepository(input: {
  organizationId: string
  categoryId: string
}) {
  return prisma.itemCategory.findFirst({
    where: {
      id: input.categoryId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  })
}

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
      project: {
        select: { id: true, name: true },
      },
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          items: true,
        },
      },
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

export async function findItemCategoryDeleteContextRepository(input: {
  organizationId: string
  categoryId: string
}) {
  return prisma.itemCategory.findFirst({
    where: {
      id: input.categoryId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
  })
}

export async function deactivateItemCategoryRepository(categoryId: string) {
  await prisma.itemCategory.update({
    where: { id: categoryId },
    data: { active: false },
  })
}

export async function deleteItemCategoryRepository(categoryId: string) {
  await prisma.itemCategory.delete({
    where: { id: categoryId },
  })
}
