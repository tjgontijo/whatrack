import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getRequestContext } from '@/lib/request-context'
import { sanitizeForAudit } from '@/lib/audit-sanitize'

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
    /**
     * Logs an audit event to the database and Pino.
     * This operation is fire-and-forget (not awaited by default) to avoid blocking the main request.
     */
    async log(input: AuditLogInput): Promise<void> {
        try {
            const context = getRequestContext()

            const auditData = {
                organizationId: input.organizationId ?? context?.organizationId ?? null,
                userId: input.userId ?? context?.userId ?? null,
                action: input.action,
                resourceType: input.resourceType,
                resourceId: input.resourceId ?? null,
                before: input.before ? sanitizeForAudit(input.before) : null,
                after: input.after ? sanitizeForAudit(input.after) : null,
                ip: context?.ip ?? null,
                userAgent: context?.userAgent ?? null,
                requestId: context?.requestId ?? null,
                metadata: input.metadata ?? null,
            }

            // Log to Pino for observability
            logger.info({
                msg: 'Audit Log Created',
                action: auditData.action,
                resource: auditData.resourceType,
                requestId: auditData.requestId,
                orgId: auditData.organizationId
            })

            // Persist to database
            await prisma.orgAuditLog.create({
                data: auditData
            })

        } catch (err) {
            // Never throw error in audit logging
            logger.error({
                err,
                action: input.action,
                orgId: input.organizationId
            }, 'Audit log failed')
        }
    }
}

export const auditService = new AuditService()
