import 'server-only'

import { Prisma } from '@generated/prisma/client'

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

export async function listLeadsRepository(input: {
  organizationId: string
  projectId?: string | null
  q: string
  page: number
  pageSize: number
  dateRange?: string
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

  const where: Prisma.LeadWhereInput = filters.length > 0 ? { AND: [baseWhere, ...filters] } : baseWhere

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
        project: {
          select: {
            name: true,
          },
        },
        createdAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ])

  return { items, total }
}

export async function findLeadByIdRepository(organizationId: string, leadId: string) {
  return prisma.lead.findFirst({ where: { id: leadId, organizationId } })
}

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

export async function deleteLeadRepository(leadId: string) {
  await prisma.lead.delete({ where: { id: leadId } })
}
