import type { Prisma } from '@generated/prisma/client'

export type LeadConflictField = 'phone' | 'waId' | 'unknown'

export class LeadConflictError extends Error {
  readonly field: LeadConflictField

  constructor(field: LeadConflictField) {
    super('Lead unique conflict')
    this.name = 'LeadConflictError'
    this.field = field
  }
}

export type LeadRecord = Prisma.LeadGetPayload<Record<string, never>>
