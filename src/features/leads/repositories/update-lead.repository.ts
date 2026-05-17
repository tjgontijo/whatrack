import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function updateLeadRepository(input: {
  leadId: string
  projectId?: string | null
  name?: string
  phone?: string
  mail?: string | null
  waId?: string | null
}) {
  return prisma.lead.update({
    where: { id: input.leadId },
    data: {
      name: input.name,
      phone: input.phone,
      mail: input.mail ?? undefined,
      waId: input.waId,
      ...(typeof input.projectId !== 'undefined' ? { projectId: input.projectId } : {}),
    },
  })
}
