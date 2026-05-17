import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function findLeadByIdRepository(organizationId: string, leadId: string) {
  return prisma.lead.findFirst({ where: { id: leadId, organizationId } })
}
