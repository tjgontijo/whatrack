import 'server-only'

import type { Prisma } from '@generated/prisma/client'

import { syncCompletedSaleForDealRepository } from '@/features/sales/repositories'

export async function syncCompletedSaleForDealService(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    dealId: string
    totalAmount: number
    notes?: string
    projectId?: string | null
  }
) {
  return syncCompletedSaleForDealRepository(tx, input)
}
