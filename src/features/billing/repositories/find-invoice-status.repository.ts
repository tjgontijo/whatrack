import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findInvoiceStatusForOrg(invoiceId: string, organizationId: string) {
  return prisma.billingInvoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true, status: true, asaasId: true },
  })
}

export async function findInvoiceStatusById(invoiceId: string) {
  return prisma.billingInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, asaasId: true },
  })
}
