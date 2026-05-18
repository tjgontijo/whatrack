import { type NextRequest, NextResponse } from 'next/server'
import { systemAuditLogsQuerySchema } from '@/features/system/schemas/system.schemas'
import { listSystemAuditLogs } from '@/features/system/services/system-audit-log.service'
import { requirePermission } from '@/lib/auth/guards'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'view:audit')
    if (user instanceof NextResponse) return user

    const parsed = systemAuditLogsQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    )

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await listSystemAuditLogs(parsed.data)
    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[system/audit-logs] Error')
    return apiError('Failed to fetch audit logs', 500, error)
  }
}
