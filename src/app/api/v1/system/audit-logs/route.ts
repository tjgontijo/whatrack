import { NextRequest, NextResponse } from 'next/server'

import { requirePermission } from '@/lib/auth/guards'
import { systemAuditLogsQuerySchema } from '@/schemas/system/system-schemas'
import { listSystemAuditLogs } from '@/services/system/system-audit-log.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'view:audit')
    if (user instanceof NextResponse) return user

    const parsed = systemAuditLogsQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    )

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listSystemAuditLogs(parsed.data)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[system/audit-logs] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
