import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import { isDateRangePreset, resolveDateRange } from '@/lib/date/date-range'
import {
  type CreateLeadInput,
  type LeadsQueryInput,
  leadsResponseSchema,
  type UpdateLeadInput,
} from '@/schemas/leads/lead-schemas'

type LeadConflictField = 'phone' | 'waId' | 'unknown'

export class LeadConflictError extends Error {
  readonly field: LeadConflictField

  constructor(field: LeadConflictField) {
    super('Lead unique conflict')
    this.name = 'LeadConflictError'
    this.field = field
  }
}

export type CreateLeadParams = {
  organizationId: string
  input: CreateLeadInput
}

export type ListLeadsParams = {
  organizationId: string
} & LeadsQueryInput

export type UpdateLeadParams = {
  organizationId: string
  leadId: string
  input: UpdateLeadInput
}

export type DeleteLeadParams = {
  organizationId: string
  leadId: string
}

function parseLeadConflictField(error: Prisma.PrismaClientKnownRequestError): LeadConflictField {
  const target = (error.meta as { target?: string[] } | undefined)?.target
  const field = target?.[1]

  if (field === 'phone') return 'phone'
  if (field === 'waId' || field === 'remote_jid') return 'waId'
  return 'unknown'
}

function rethrowLeadConflict(error: unknown): never {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as Prisma.PrismaClientKnownRequestError).code === 'P2002'
  ) {
    throw new LeadConflictError(parseLeadConflictField(error as Prisma.PrismaClientKnownRequestError))
  }
  throw error
}

export async function createLead(params: CreateLeadParams) {
  try {
    return await prisma.lead.create({
      data: {
        organizationId: params.organizationId,
        name: params.input.name,
        phone: params.input.phone,
        mail: params.input.mail || null,
        waId: params.input.waId,
      },
    })
  } catch (error) {
    rethrowLeadConflict(error)
  }
}

export async function listLeads(params: ListLeadsParams) {
  const q = params.q.trim()

  const filters: Prisma.LeadWhereInput[] = []

  if (q) {
    const ors: Prisma.LeadWhereInput[] = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { mail: { contains: q, mode: 'insensitive' } },
      { waId: { contains: q, mode: 'insensitive' } },
    ]
    const looksLikeUuid = /^[0-9a-fA-F-]{32,36}$/.test(q)
    if (looksLikeUuid) ors.push({ id: q })
    filters.push({ OR: ors })
  }

  if (params.dateRange && isDateRangePreset(params.dateRange)) {
    const range = resolveDateRange(params.dateRange)
    filters.push({ createdAt: { gte: range.gte, lte: range.lte } })
  }

  const baseWhere: Prisma.LeadWhereInput = { organizationId: params.organizationId }
  const where: Prisma.LeadWhereInput =
    filters.length > 0 ? { AND: [baseWhere, ...filters] } : baseWhere

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        name: true,
        phone: true,
        mail: true,
        waId: true,
        createdAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ])

  return leadsResponseSchema.parse({
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
  })
}

export async function getLeadById(organizationId: string, leadId: string) {
  return prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId,
    },
  })
}

export async function updateLead(params: UpdateLeadParams) {
  const existing = await prisma.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return null
  }

  try {
    return await prisma.lead.update({
      where: { id: params.leadId },
      data: {
        name: params.input.name,
        phone: params.input.phone,
        mail: params.input.mail ?? undefined,
        waId: params.input.waId,
      },
    })
  } catch (error) {
    rethrowLeadConflict(error)
  }
}

export async function deleteLead(params: DeleteLeadParams) {
  const existing = await prisma.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return false
  }

  await prisma.lead.delete({
    where: { id: params.leadId },
  })

  return true
}
