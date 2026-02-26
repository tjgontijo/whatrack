import { NextRequest, NextResponse } from 'next/server'

import { requirePermission } from '@/lib/auth/guards'
import { apiError } from '@/lib/utils/api-response'
import { listSystemAuditLogFilters } from '@/services/system/system-audit-log.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'view:audit')
    if (user instanceof NextResponse) return user

    const response = await listSystemAuditLogFilters()
    return NextResponse.json(response)
  } catch (error) {
    console.error('[system/audit-logs/filters] Error:', error)
    return apiError('Failed to fetch audit log filters', 500, error)
  }
}
