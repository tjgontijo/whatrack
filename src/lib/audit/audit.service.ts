import { sanitizeForAudit } from '@/lib/audit/audit-sanitize'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { getRequestContext } from '@/lib/utils/request-context'

export interface AuditLogInput {
  organizationId?: string // optional: can be null for global/system events
  action: string
  resourceType: string
  resourceId?: string
  before?: any
  after?: any
  userId?: string // optional: supports system actions without a specific user
  metadata?: Record<string, any>
}

class AuditService {
  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private isOrganizationFkError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const candidate = error as {
      code?: string
      meta?: {
        field_name?: string
        modelName?: string
        constraint?: string
        driverAdapterError?: {
          cause?: {
            constraint?: {
              index?: string
            }
          }
        }
      }
    }

    if (candidate.code !== 'P2003') return false

    const fieldName = String(candidate.meta?.field_name ?? '')
    const modelName = String(candidate.meta?.modelName ?? '')
    const constraint = String(
      candidate.meta?.constraint ?? candidate.meta?.driverAdapterError?.cause?.constraint?.index ?? ''
    )

    return (
      fieldName.includes('organizationId') ||
      modelName === 'OrgAuditLog' ||
      constraint.includes('org_audit_logs_organizationId_fkey')
    )
  }

  private async persistWithRetry(auditData: {
    organizationId?: string
    userId?: string
    action: string
    resourceType: string
    resourceId?: string
    before?: any
    after?: any
    ip?: string
    userAgent?: string
    requestId?: string
    metadata?: Record<string, any>
  }) {
    const maxAttempts = 8
    const retryableAction =
      auditData.action === 'organization.create' || auditData.action === 'member.create'

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await prisma.orgAuditLog.create({ data: auditData })
        return
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts
        const shouldRetry = retryableAction && this.isOrganizationFkError(error) && !isLastAttempt

        if (shouldRetry) {
          await this.sleep(attempt * 125)
          continue
        }

        throw error
      }
    }
  }

  /**
   * Logs an audit event to the database and Pino.
   * This operation is fire-and-forget (not awaited by default) to avoid blocking the main request.
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      const context = getRequestContext()

      const auditData = {
        organizationId: input.organizationId ?? context?.organizationId ?? undefined,
        userId: input.userId ?? context?.userId ?? undefined,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? undefined,
        before: input.before ? sanitizeForAudit(input.before) : undefined,
        after: input.after ? sanitizeForAudit(input.after) : undefined,
        ip: context?.ip ?? undefined,
        userAgent: context?.userAgent ?? undefined,
        requestId: context?.requestId ?? undefined,
        metadata: input.metadata ?? undefined,
      }

      // Log to Pino for observability
      logger.info({
        msg: 'Audit Log Created',
        action: auditData.action,
        resource: auditData.resourceType,
        requestId: auditData.requestId,
        orgId: auditData.organizationId,
      })

      // Persist to database with retry for transaction visibility races.
      await this.persistWithRetry(auditData)
    } catch (err) {
      // Never throw error in audit logging
      logger.error(
        {
          err,
          action: input.action,
          orgId: input.organizationId,
        },
        'Audit log failed'
      )
    }
  }
}

export const auditService = new AuditService()
