import { NextRequest } from 'next/server'

import { organizationJson } from '@/server/http/organization-json'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { removeOrganizationMember } from '@/services/organizations/organization-members.service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.userId || !access.role) {
    return organizationJson({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { memberId } = await params
  const result = await removeOrganizationMember({
    organizationId: access.organizationId,
    actorUserId: access.userId,
    actorRole: access.role,
    memberId,
  })

  if ('error' in result) {
    return organizationJson({ error: result.error }, { status: result.status })
  }

  return organizationJson(result, { status: 200 })
}
