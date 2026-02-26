import { NextRequest } from 'next/server'

import { organizationJson } from '@/server/http/organization-json'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { createOrganizationInvitationSchema } from '@/schemas/organization-invitation-schemas'
import {
  createOrganizationInvitation,
  listOrganizationPendingInvitations,
} from '@/services/organizations/organization-invitations.service'

export async function POST(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.userId || !access.role) {
    return organizationJson({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createOrganizationInvitationSchema.safeParse(body)
  if (!parsed.success) {
    return organizationJson({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const result = await createOrganizationInvitation({
    organizationId: access.organizationId,
    actorUserId: access.userId,
    actorRole: access.role,
    actorGlobalRole: access.globalRole,
    data: parsed.data,
  })

  if ('error' in result) {
    return organizationJson({ error: result.error }, { status: result.status })
  }

  return organizationJson(result, { status: 201 })
}

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:members')
  if (!access.hasAccess || !access.organizationId || !access.role) {
    return organizationJson({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const result = await listOrganizationPendingInvitations({
    organizationId: access.organizationId,
    actorRole: access.role,
  })

  if ('error' in result) {
    return organizationJson({ error: result.error }, { status: result.status })
  }

  return organizationJson(result, { status: 200 })
}
