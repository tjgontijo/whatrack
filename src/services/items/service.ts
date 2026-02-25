import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'

const MIN_PAGE_SIZE = 1
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export type ListItemsParams = {
  organizationId: string
  search?: string
  status?: 'active' | 'inactive'
  categoryId?: string
  page?: number
  pageSize?: number
}

export type ItemListItem = {
  id: string
  name: string
  active: boolean
  category: {
    id: string
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

export type ItemListResponse = {
  items: ItemListItem[]
  total: number
  page: number
  pageSize: number
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

export async function listItems(params: ListItemsParams): Promise<ItemListResponse> {
  const page = normalizePage(params.page)
  const pageSize = normalizePageSize(params.pageSize)

  const where: Prisma.ItemWhereInput = {
    organizationId: params.organizationId,
  }

  if (params.search?.trim()) {
    where.name = {
      contains: params.search.trim(),
      mode: 'insensitive',
    }
  }

  if (params.categoryId) {
    where.categoryId = params.categoryId
  }

  if (params.status === 'active') {
    where.active = true
  } else if (params.status === 'inactive') {
    where.active = false
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.item.count({ where }),
  ])

  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      active: item.active,
      category: item.category ? { id: item.category.id, name: item.category.name } : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  }
}

export type CreateItemParams = {
  organizationId: string
  name: string
  categoryId?: string | null
}

export async function createItem(params: CreateItemParams): Promise<ItemListItem> {
  const created = await prisma.item.create({
    data: {
      organizationId: params.organizationId,
      name: params.name.trim(),
      categoryId: params.categoryId ?? undefined,
      active: true,
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
  })

  return {
    id: created.id,
    name: created.name,
    active: created.active,
    category: created.category ? { id: created.category.id, name: created.category.name } : null,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }
}

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
      include: {
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
