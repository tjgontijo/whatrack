import { NextRequest } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { organizationJson } from '@/server/http/organization-json'
import { updateOrganizationMemberRoleSchema } from '@/schemas/organizations/organization-member-schemas'
import { updateOrganizationMemberRole } from '@/services/organizations/organization-members.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.userId || !access.role) {
    return organizationJson({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateOrganizationMemberRoleSchema.safeParse(body)
  if (!parsed.success) {
    return organizationJson({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { memberId } = await params
  const result = await updateOrganizationMemberRole({
    organizationId: access.organizationId,
    actorUserId: access.userId,
    actorRole: access.role,
    actorGlobalRole: access.globalRole,
    memberId,
    role: parsed.data.role,
  })

  if ('error' in result) {
    return organizationJson({ error: result.error }, { status: result.status })
  }

  return organizationJson(result, { status: 200 })
}
