import { NextRequest } from 'next/server'

import { validateFullAccess, validateOwnerAccess } from '@/server/auth/validate-organization-access'
import { organizationJson } from '@/server/http/organization-json'
import { updateOrganizationSchema } from '@/schemas/organization-schemas'
import { getOrganizationMe, updateOrganizationMe } from '@/services/organizations/organization.service'

export async function GET(req: NextRequest) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId || !access.memberId) {
    return organizationJson({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const result = await getOrganizationMe({
    organizationId: access.organizationId,
    memberId: access.memberId,
    role: access.role,
  })

  if ('error' in result) {
    return organizationJson({ error: result.error }, { status: result.status })
  }

  return organizationJson(result, { status: 200 })
}

export async function PUT(req: NextRequest) {
  const access = await validateOwnerAccess(req)
  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return organizationJson({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateOrganizationSchema.safeParse(body)
  if (!parsed.success) {
    return organizationJson({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const result = await updateOrganizationMe({
    organizationId: access.organizationId,
    userId: access.userId,
    role: access.role,
    data: parsed.data,
  })

  if ('error' in result) {
    return organizationJson({ error: result.error, ...(result.details ? { details: result.details } : {}) }, { status: result.status })
  }

  return organizationJson(result, { status: 200 })
}

export async function PATCH(req: NextRequest) {
  return PUT(req)
}
