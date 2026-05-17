import 'server-only'

import { prisma } from '@/lib/db/prisma'

export async function deleteSaleRepository(saleId: string) {
  await prisma.sale.delete({ where: { id: saleId } })
}
