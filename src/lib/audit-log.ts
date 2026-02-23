import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface AuditLogParams {
  organizationId: string
  userId: string
  action: string
  resourceType: string
  resourceId?: string
  before?: Prisma.InputJsonValue
  after?: Prisma.InputJsonValue
}

/**
 * Creates an org audit log entry. Never throws — failures are logged to console only.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.orgAuditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
      },
    })
  } catch (err) {
    console.error('[AuditLog] Failed to create audit log entry:', err)
  }
}
