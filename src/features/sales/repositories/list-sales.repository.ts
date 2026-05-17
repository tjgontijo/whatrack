import 'server-only'

import type { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'

export async function listSalesRepository(input: {
  organizationId: string
  projectId?: string | null
  q: string
  status?: string
  dateFilter?: { gte: Date; lte: Date }
  page: number
  pageSize: number
}) {
  const filters: Prisma.SaleWhereInput[] = []

  if (input.q) {
    filters.push({ OR: [{ notes: { contains: input.q, mode: 'insensitive' } }] })
  }

  if (input.dateFilter) {
    filters.push({ createdAt: { gte: input.dateFilter.gte, lte: input.dateFilter.lte } })
  }

  if (input.status) {
    filters.push({ status: input.status })
  }

  const baseWhere: Prisma.SaleWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  }

  const where: Prisma.SaleWhereInput =
    filters.length > 0 ? { AND: [baseWhere, ...filters] } : baseWhere

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        notes: true,
        projectId: true,
        project: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.sale.count({ where }),
  ])

  return { sales, total }
}
