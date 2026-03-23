import 'server-only'

import { prisma } from '@/lib/db/prisma'

export async function listAiEvents(input: {
  organizationId: string
  projectId?: string | null
  leadId?: string
  ticketId?: string
  take?: number
}) {
  return prisma.aiEvent.findMany({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? undefined,
      leadId: input.leadId,
      ticketId: input.ticketId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: input.take ?? 100,
  })
}
