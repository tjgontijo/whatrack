import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const MIN_PAGE_SIZE = 1
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export type ListProductsParams = {
  organizationId: string
  search?: string
  status?: 'active' | 'inactive'
  categoryId?: string
  page?: number
  pageSize?: number
}

export type ProductListItem = {
  id: string
  name: string
  active: boolean
  category:
    | {
        id: string
        name: string
      }
    | null
  price: number | null
  cost: number | null
  createdAt: string
  updatedAt: string
}

export type ProductListResponse = {
  items: ProductListItem[]
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

function toDecimal(value: number | null | undefined) {
  if (value == null) return undefined
  return new Prisma.Decimal(value)
}

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  if (value == null) return null
  return Number(value)
}

export async function listProducts(params: ListProductsParams): Promise<ProductListResponse> {
  const page = normalizePage(params.page)
  const pageSize = normalizePageSize(params.pageSize)

  const where: Prisma.ProductWhereInput = {
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
    prisma.product.findMany({
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
    prisma.product.count({ where }),
  ])

  return {
    items: items.map((product) => ({
      id: product.id,
      name: product.name,
      active: product.active,
      category: product.category ? { id: product.category.id, name: product.category.name } : null,
      price: decimalToNumber(product.price),
      cost: decimalToNumber(product.cost),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  }
}

export type CreateProductParams = {
  organizationId: string
  name: string
  categoryId?: string | null
  price?: number | null
  cost?: number | null
}

export async function createProduct(params: CreateProductParams): Promise<ProductListItem> {
  const created = await prisma.product.create({
    data: {
      organizationId: params.organizationId,
      name: params.name.trim(),
      categoryId: params.categoryId ?? undefined,
      price: toDecimal(params.price),
      cost: toDecimal(params.cost),
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
    price: decimalToNumber(created.price),
    cost: decimalToNumber(created.cost),
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }
}

export type ListCategoriesParams = {
  organizationId: string
  search?: string
  status?: 'active' | 'inactive'
  page?: number
  pageSize?: number
}

export type CategoryListItem = {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CategoryListResponse = {
  items: CategoryListItem[]
  total: number
  page: number
  pageSize: number
}

export async function listCategories(params: ListCategoriesParams): Promise<CategoryListResponse> {
  const page = normalizePage(params.page)
  const pageSize = normalizePageSize(params.pageSize)

  const where: Prisma.ProductCategoryWhereInput = {
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
    prisma.productCategory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productCategory.count({ where }),
  ])

  return {
    items: items.map((category) => ({
      id: category.id,
      name: category.name,
      active: category.active,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  }
}

export type CreateCategoryParams = {
  organizationId: string
  name: string
}

export async function createCategory(params: CreateCategoryParams): Promise<CategoryListItem> {
  const created = await prisma.productCategory.create({
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
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }
}
