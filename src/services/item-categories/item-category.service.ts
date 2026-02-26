import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'

const MIN_PAGE_SIZE = 1
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export type ListItemCategoriesParams = {
  organizationId: string
  search?: string
  status?: 'active' | 'inactive'
  page?: number
  pageSize?: number
}

export type ItemCategoryListItem = {
  id: string
  name: string
  active: boolean
  itemsCount: number
  createdAt: string
  updatedAt: string
}

export type ItemCategoryListResponse = {
  items: ItemCategoryListItem[]
  total: number
  page: number
  pageSize: number
}

type CategorySummary = {
  id: string
  name: string
  active: boolean
  itemsCount: number
  createdAt: string
  updatedAt: string
}

type ItemCategoryWithCount = {
  id: string
  organizationId: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    items: number
  }
}

function normalizePage(input?: number) {
  if (!input || Number.isNaN(input) || input < 1) return 1
  return Math.floor(input)
}

function normalizePageSize(input?: number) {
  if (!input || Number.isNaN(input)) return DEFAULT_PAGE_SIZE
  const value = Math.floor(input)
  if (value < MIN_PAGE_SIZE || value > MAX_PAGE_SIZE) {
    return DEFAULT_PAGE_SIZE
  }
  return value
}

export async function listItemCategories(
  params: ListItemCategoriesParams
): Promise<ItemCategoryListResponse> {
  const page = normalizePage(params.page)
  const pageSize = normalizePageSize(params.pageSize)

  const where: Prisma.ItemCategoryWhereInput = {
    organizationId: params.organizationId,
  }

  if (params.search?.trim()) {
    where.name = {
      contains: params.search.trim(),
      mode: 'insensitive',
    }
  }

  if (params.status === 'active') {
    where.active = true
  } else if (params.status === 'inactive') {
    where.active = false
  }

  const [items, total] = await Promise.all([
    prisma.itemCategory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
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
    }),
    prisma.itemCategory.count({ where }),
  ])

  return {
    items: items.map((category) => ({
      id: category.id,
      name: category.name,
      active: category.active,
      itemsCount: category._count.items,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  }
}

export type CreateItemCategoryParams = {
  organizationId: string
  name: string
}

export async function createItemCategory(
  params: CreateItemCategoryParams
): Promise<ItemCategoryListItem> {
  const created = await prisma.itemCategory.create({
    data: {
      organizationId: params.organizationId,
      name: params.name.trim(),
      active: true,
    },
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    id: created.id,
    name: created.name,
    active: created.active,
    itemsCount: 0,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }
}

export async function getItemCategoryById(input: {
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

export async function updateItemCategory(input: {
  organizationId: string
  categoryId: string
  name?: string
  active?: boolean
}): Promise<
  | CategorySummary
  | { error: 'Categoria não encontrada'; status: 404 }
  | { error: 'Já existe uma categoria com este nome'; status: 409 }
> {
  const existing = await prisma.itemCategory.findFirst({
    where: {
      id: input.categoryId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return { error: 'Categoria não encontrada', status: 404 }
  }

  try {
    const updated = await prisma.itemCategory.update({
      where: { id: input.categoryId },
      data: {
        name: input.name?.trim(),
        active: input.active,
      },
      select: {
        id: true,
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

    return {
      id: updated.id,
      name: updated.name,
      active: updated.active,
      itemsCount: updated._count.items,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'Já existe uma categoria com este nome', status: 409 }
    }
    throw error
  }
}

export async function deleteItemCategory(input: {
  organizationId: string
  categoryId: string
}): Promise<
  | { success: true }
  | { success: true; message: 'Categoria desativada (há itens vinculados)' }
  | { error: 'Categoria não encontrada'; status: 404 }
> {
  const existing = await prisma.itemCategory.findFirst({
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

  if (!existing) {
    return { error: 'Categoria não encontrada', status: 404 }
  }

  if (existing._count.items > 0) {
    await prisma.itemCategory.update({
      where: { id: input.categoryId },
      data: { active: false },
    })

    return {
      success: true,
      message: 'Categoria desativada (há itens vinculados)',
    }
  }

  await prisma.itemCategory.delete({
    where: { id: input.categoryId },
  })

  return { success: true }
}
