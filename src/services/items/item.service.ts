import { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import { ensureProjectBelongsToOrganization } from '@/server/project/project-scope'

const MIN_PAGE_SIZE = 1
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export type ListItemsParams = {
  organizationId: string
  projectId?: string | null
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
  projectId: string | null
  projectName: string | null
  createdAt: string
  updatedAt: string
}

export type ItemListResponse = {
  items: ItemListItem[]
  total: number
  page: number
  pageSize: number
}

type ItemSummary = {
  id: string
  organizationId: string
  categoryId: string | null
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

type ItemWithCategoryAndCount = ItemSummary & {
  category: {
    id: string
    organizationId: string
    name: string
    active: boolean
    createdAt: Date
    updatedAt: Date
  } | null
  projectId: string | null
  project: {
    id: string
    name: string
  } | null
  _count: {
    saleItems: number
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

export async function listItems(params: ListItemsParams): Promise<ItemListResponse> {
  const page = normalizePage(params.page)
  const pageSize = normalizePageSize(params.pageSize)

  const where: Prisma.ItemWhereInput = {
    organizationId: params.organizationId,
    ...(params.projectId ? { projectId: params.projectId } : {}),
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

  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      active: item.active,
      category: item.category ? { id: item.category.id, name: item.category.name } : null,
      projectId: item.projectId,
      projectName: item.project?.name ?? null,
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
  projectId?: string | null
  name: string
  categoryId?: string | null
}

export async function createItem(params: CreateItemParams): Promise<ItemListItem> {
  if (params.projectId) {
    const project = await ensureProjectBelongsToOrganization(params.organizationId, params.projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  const created = await prisma.item.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId ?? null,
      name: params.name.trim(),
      categoryId: params.categoryId ?? undefined,
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

  return {
    id: created.id,
    name: created.name,
    active: created.active,
    category: created.category ? { id: created.category.id, name: created.category.name } : null,
    projectId: created.projectId,
    projectName: created.project?.name ?? null,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }
}

export async function getItemById(input: {
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

export async function updateItem(input: {
  organizationId: string
  itemId: string
  name?: string
  categoryId?: string | null
  active?: boolean
  projectId?: string | null
}): Promise<ItemSummary | { error: 'Item não encontrado'; status: 404 }> {
  const existing = await prisma.item.findFirst({
    where: {
      id: input.itemId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return { error: 'Item não encontrado', status: 404 }
  }

  if (input.projectId) {
    const project = await ensureProjectBelongsToOrganization(input.organizationId, input.projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

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

export async function deleteItem(input: {
  organizationId: string
  itemId: string
}): Promise<
  | { success: true }
  | { success: true; message: 'Item desativado (está sendo usado em vendas)' }
  | { error: 'Item não encontrado'; status: 404 }
> {
  const existing = await prisma.item.findFirst({
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

  if (!existing) {
    return { error: 'Item não encontrado', status: 404 }
  }

  if (existing._count.saleItems > 0) {
    await prisma.item.update({
      where: { id: input.itemId },
      data: { active: false },
    })

    return {
      success: true,
      message: 'Item desativado (está sendo usado em vendas)',
    }
  }

  await prisma.item.delete({
    where: { id: input.itemId },
  })

  return { success: true }
}

export async function toggleItemActive(input: {
  organizationId: string
  itemId: string
}): Promise<ItemSummary | { error: 'Item não encontrado'; status: 404 }> {
  const existing = await prisma.item.findFirst({
    where: {
      id: input.itemId,
      organizationId: input.organizationId,
    },
    select: { id: true, active: true },
  })

  if (!existing) {
    return { error: 'Item não encontrado', status: 404 }
  }

  return prisma.item.update({
    where: { id: input.itemId },
    data: {
      active: !existing.active,
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
