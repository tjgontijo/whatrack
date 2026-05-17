import 'server-only'

import { Prisma } from '@generated/prisma/client'

import { isDateRangePreset, resolveDateRange } from '@/lib/date/date-range'
import { LeadConflictError, type LeadConflictField } from '@/features/leads/types'

export function parseLeadConflictField(error: Prisma.PrismaClientKnownRequestError): LeadConflictField {
  const target = (error.meta as { target?: string[] } | undefined)?.target
  const field = target?.[1]

  if (field === 'phone') return 'phone'
  if (field === 'waId' || field === 'remote_jid') return 'waId'
  return 'unknown'
}

export function rethrowLeadConflict(error: unknown): never {
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

export function resolveOptionalDateRange(dateRange?: string) {
  if (!dateRange || !isDateRangePreset(dateRange)) return null
  return resolveDateRange(dateRange)
}
