import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function createLeadRepository(input: {
  organizationId: string
  projectId?: string | null
  name?: string
  phone?: string
  mail?: string | null
  waId?: string | null
}) {
  return prisma.lead.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      name: input.name,
      phone: input.phone,
      mail: input.mail || null,
      waId: input.waId,
    },
  })
}
