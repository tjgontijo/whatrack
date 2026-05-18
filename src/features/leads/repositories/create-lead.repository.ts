import 'server-only'
import { lookupCache } from '@/lib/db/lookup-cache'
import { prisma } from '@/lib/db/prisma'

export async function createLeadRepository(input: {
  organizationId: string
  projectId?: string | null
  name?: string
  phone?: string
  mail?: string | null
  waId?: string | null
  sourceId?: string
}) {
  // Use provided sourceId or fetch 'direct_creation' as default
  const sourceId = input.sourceId || (await lookupCache.getLeadSourceId('direct_creation'))

  return prisma.lead.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      name: input.name,
      phone: input.phone,
      mail: input.mail || null,
      waId: input.waId,
      sourceId,
    },
  })
}
