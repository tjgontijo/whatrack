import type { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import { isDateRangePreset, resolveDateRange } from '@/lib/date/date-range'
import { ensureProjectBelongsToOrganization } from '@/server/project/project-scope'
import {
  type CreateSaleInput,
  type SalesQueryInput,
  salesResponseSchema,
  type UpdateSaleInput,
} from '@/schemas/sales/sale-schemas'

const saleItemSelect = {
  id: true,
  organizationId: true,
  saleId: true,
  itemId: true,
  name: true,
  quantity: true,
  unitPrice: true,
  total: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SaleItemSelect

const saleWithItemsSelect = {
  id: true,
  organizationId: true,
  totalAmount: true,
  profit: true,
  discount: true,
  status: true,
  notes: true,
  createdBy: true,
  updatedBy: true,
  statusChangedAt: true,
  ticketId: true,
  createdAt: true,
  updatedAt: true,
  items: { select: saleItemSelect },
} satisfies Prisma.SaleSelect

export type ListSalesParams = {
  organizationId: string
  projectId?: string | null
} & Omit<SalesQueryInput, 'projectId'>

export type CreateSaleParams = {
  organizationId: string
  userId?: string
  projectId?: string | null
  input: CreateSaleInput
}

export type UpdateSaleParams = {
  organizationId: string
  saleId: string
  userId?: string
  projectId?: string | null
  input: UpdateSaleInput
}

export type DeleteSaleParams = {
  organizationId: string
  saleId: string
}

export type SyncCompletedSaleForTicketParams = {
  organizationId: string
  ticketId: string
  totalAmount: number
  notes?: string
  projectId?: string | null
}

export async function createSale(params: CreateSaleParams) {
  const { organizationId, userId, input } = params
  const projectId =
    typeof input.projectId !== 'undefined' ? input.projectId : params.projectId

  if (projectId) {
    const project = await ensureProjectBelongsToOrganization(organizationId, projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  let calculatedTotal = input.totalAmount || 0
  if (input.items && input.items.length > 0) {
    calculatedTotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    if (input.discount) {
      calculatedTotal -= input.discount
    }
  }

  return prisma.sale.create({
    data: {
      organizationId,
      projectId: projectId ?? null,
      totalAmount: calculatedTotal,
      profit: input.profit,
      discount: input.discount,
      status: input.status || 'pending',
      notes: input.notes,
      createdBy: userId,
      items: input.items
        ? {
            create: input.items.map((item) => ({
              organizationId,
              itemId: item.itemId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          }
        : undefined,
    },
    select: saleWithItemsSelect,
  })
}

export async function syncCompletedSaleForTicket(
  tx: Prisma.TransactionClient,
  params: SyncCompletedSaleForTicketParams
) {
  const existingSale = await tx.sale.findFirst({
    where: {
      organizationId: params.organizationId,
      ticketId: params.ticketId,
    },
    select: { id: true },
  })

  const saleData = {
    projectId: params.projectId ?? null,
    totalAmount: params.totalAmount,
    status: 'completed' as const,
    statusChangedAt: new Date(),
    ...(params.notes ? { notes: params.notes } : {}),
  }

  if (existingSale) {
    return tx.sale.update({
      where: { id: existingSale.id },
      data: saleData,
      select: { id: true },
    })
  }

  return tx.sale.create({
    data: {
      organizationId: params.organizationId,
      ticketId: params.ticketId,
      ...saleData,
    },
    select: { id: true },
  })
}

export async function listSales(params: ListSalesParams) {
  const q = params.q.trim()
  const statusFilter = params.status?.trim() || undefined

  const filters: Prisma.SaleWhereInput[] = []

  if (q) {
    filters.push({ OR: [{ notes: { contains: q, mode: 'insensitive' } }] })
  }

  if (params.dateRange && isDateRangePreset(params.dateRange)) {
    const range = resolveDateRange(params.dateRange)
    filters.push({ createdAt: { gte: range.gte, lte: range.lte } })
  }

  if (statusFilter) {
    filters.push({ status: statusFilter })
  }

  const baseWhere: Prisma.SaleWhereInput = {
    organizationId: params.organizationId,
    ...(params.projectId ? { projectId: params.projectId } : {}),
  }
  const where: Prisma.SaleWhereInput =
    filters.length > 0 ? { AND: [baseWhere, ...filters] } : baseWhere

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
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

  return salesResponseSchema.parse({
    items: sales.map((sale) => ({
      id: sale.id,
        totalAmount: sale.totalAmount ? Number(sale.totalAmount) : null,
        status: sale.status,
        notes: sale.notes,
        projectId: sale.projectId ?? null,
        projectName: sale.project?.name ?? null,
        createdAt: sale.createdAt.toISOString(),
        updatedAt: sale.updatedAt.toISOString(),
      })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  })
}

export async function updateSale(params: UpdateSaleParams) {
  const { organizationId, saleId, userId, input } = params
  const projectId =
    typeof input.projectId !== 'undefined' ? input.projectId : params.projectId

  const existing = await prisma.sale.findFirst({
    where: {
      id: saleId,
      organizationId,
    },
    select: {
      id: true,
      status: true,
      statusChangedAt: true,
    },
  })

  if (!existing) {
    return null
  }

  if (projectId) {
    const project = await ensureProjectBelongsToOrganization(organizationId, projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  const statusChangedAt =
    input.status && input.status !== existing.status ? new Date() : existing.statusChangedAt

  return prisma.sale.update({
    where: { id: saleId },
    data: {
      totalAmount: input.totalAmount,
      profit: input.profit,
      discount: input.discount,
      status: input.status,
      notes: input.notes,
      ...(typeof projectId !== 'undefined' ? { projectId } : {}),
      updatedBy: userId,
      statusChangedAt,
    },
    select: saleWithItemsSelect,
  })
}

export async function deleteSale(params: DeleteSaleParams) {
  const existing = await prisma.sale.findFirst({
    where: {
      id: params.saleId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return false
  }

  await prisma.sale.delete({
    where: { id: params.saleId },
  })

  return true
}
