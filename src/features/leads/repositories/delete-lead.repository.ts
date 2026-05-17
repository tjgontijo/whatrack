import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function deleteLeadRepository(leadId: string) {
  await prisma.lead.delete({ where: { id: leadId } })
}
