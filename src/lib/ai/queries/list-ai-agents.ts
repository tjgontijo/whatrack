import 'server-only'

import { prisma } from '@/lib/db/prisma'

export async function listAiAgents() {
  return prisma.aiAgent.findMany({
    orderBy: { name: 'asc' },
  })
}
