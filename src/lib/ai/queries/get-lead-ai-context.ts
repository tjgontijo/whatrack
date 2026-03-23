import 'server-only'

import { prisma } from '@/lib/db/prisma'

export async function getLeadAiContext(leadId: string) {
  return prisma.leadAiContext.findUnique({
    where: { leadId },
  })
}
