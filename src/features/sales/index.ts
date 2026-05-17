import 'server-only'

import {
  createSaleService,
  deleteSaleService,
  listSalesService,
  syncCompletedSaleForTicketService,
  updateSaleService,
} from '@/features/sales/server'

export {
  createSaleSchema,
  salesQuerySchema,
  salesResponseSchema,
  updateSaleSchema,
  type CreateSaleInput,
  type SalesQueryInput,
  type SalesResponse,
  type UpdateSaleInput,
} from '@/features/sales/schemas/sale.schemas'

export async function createSale(input: {
  organizationId: string
  userId?: string
  projectId?: string | null
  input: unknown
}) {
  return createSaleService({
    organizationId: input.organizationId,
    userId: input.userId,
    projectId: input.projectId,
    payload: input.input,
  })
}

export async function listSales(input: {
  organizationId: string
  projectId?: string | null
  q?: string
  page?: number
  pageSize?: number
  dateRange?: string
  status?: string
}) {
  return listSalesService({
    organizationId: input.organizationId,
    projectId: input.projectId,
    filters: {
      q: input.q ?? '',
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
      dateRange: input.dateRange,
      status: input.status,
      projectId: input.projectId ?? undefined,
    },
  })
}

export async function updateSale(input: {
  organizationId: string
  saleId: string
  userId?: string
  projectId?: string | null
  input: unknown
}) {
  return updateSaleService({
    organizationId: input.organizationId,
    saleId: input.saleId,
    userId: input.userId,
    projectId: input.projectId,
    payload: input.input,
  })
}

export async function deleteSale(input: {
  organizationId: string
  saleId: string
  projectId?: string | null
}) {
  return deleteSaleService(input)
}

export { syncCompletedSaleForTicketService as syncCompletedSaleForTicket }
