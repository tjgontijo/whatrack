import { auditService, AuditLogInput } from './audit.service'

export type AuditLogParams = AuditLogInput

/**
 * Creates an org audit log entry. Never throws — failures are logged via Pino.
 * This is a compatibility wrapper for the new AuditService.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  // We use void to fire-and-forget, but provide await for compatibility
  await auditService.log(params)
}
