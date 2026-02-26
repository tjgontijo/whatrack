import { NextRequest } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { organizationJson } from '@/server/http/organization-json'
import { deleteOrganizationInvitation } from '@/services/organizations/organization-invitations.service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.userId || !access.role) {
    return organizationJson({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params

  const result = await deleteOrganizationInvitation({
    organizationId: access.organizationId,
    actorUserId: access.userId,
    actorRole: access.role,
    invitationId: id,
  })

  if ('error' in result) {
    return organizationJson({ error: result.error }, { status: result.status })
  }

  return organizationJson(result, { status: 200 })
}
