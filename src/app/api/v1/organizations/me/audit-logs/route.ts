import { NextRequest } from 'next/server'

import { organizationJson } from '@/server/http/organization-json'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { organizationAuditLogsQuerySchema } from '@/schemas/organizations/organization-schemas'
import { listOrganizationAuditLogs } from '@/services/organizations/organization-audit.service'

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'view:audit')
  if (!access.hasAccess || !access.organizationId) {
    return organizationJson({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = organizationAuditLogsQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return organizationJson({ error: 'Parâmetros inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = await listOrganizationAuditLogs({
    organizationId: access.organizationId,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    action: parsed.data.action,
    resourceType: parsed.data.resourceType,
  })

  return organizationJson(data, { status: 200 })
}
