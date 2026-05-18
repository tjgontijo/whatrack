import 'server-only'

import type { Prisma } from '@generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

export async function listLeadsRepository(input: {
  organizationId: string
  projectId?: string | null
  q: string
  page: number
  pageSize: number
  dateFilter?: { gte: Date; lte: Date } | null
}) {
  const filters: Prisma.LeadWhereInput[] = []

  if (input.q) {
    const ors: Prisma.LeadWhereInput[] = [
      { name: { contains: input.q, mode: 'insensitive' } },
      { phone: { contains: input.q, mode: 'insensitive' } },
      { mail: { contains: input.q, mode: 'insensitive' } },
      { waId: { contains: input.q, mode: 'insensitive' } },
    ]
    const looksLikeUuid = /^[0-9a-fA-F-]{32,36}$/.test(input.q)
    if (looksLikeUuid) ors.push({ id: input.q })
    filters.push({ OR: ors })
  }

  if (input.dateFilter) {
    filters.push({ createdAt: { gte: input.dateFilter.gte, lte: input.dateFilter.lte } })
  }

  const baseWhere: Prisma.LeadWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  }
  const where: Prisma.LeadWhereInput =
    filters.length > 0 ? { AND: [baseWhere, ...filters] } : baseWhere

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        name: true,
        phone: true,
        mail: true,
        waId: true,
        projectId: true,
        project: { select: { name: true } },
        createdAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ])

  return { items, total }
}
