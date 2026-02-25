import { NextRequest, NextResponse } from 'next/server'

import { auditService } from '@/services/audit/audit.service'
import { prisma } from '@/lib/db/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { legacyOrganizationJson } from '@/server/http/legacy-organization'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id'
    )
  }

  if (access.role !== 'owner' && access.role !== 'admin') {
    return legacyOrganizationJson(
      { error: 'Apenas owner/admin podem gerenciar convites.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id'
    )
  }

  const { id } = await params

  const invitation = await prisma.invitation.findFirst({
    where: {
      id,
      organizationId: access.teamId,
    },
    select: {
      id: true,
      role: true,
      email: true,
      status: true,
    },
  })

  if (!invitation) {
    return legacyOrganizationJson(
      { error: 'Convite não encontrado' },
      { status: 404 },
      '/api/v1/organizations/me/invitations/:id'
    )
  }

  if (invitation.role === 'owner' && access.role !== 'owner') {
    return legacyOrganizationJson(
      { error: 'Somente owner pode remover convite de owner.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id'
    )
  }

  if (access.role === 'admin' && invitation.role && !['user', 'admin'].includes(invitation.role)) {
    return legacyOrganizationJson(
      { error: 'Admin pode remover apenas convites de user/admin.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id'
    )
  }

  await prisma.invitation.delete({
    where: { id: invitation.id },
  })

  void auditService.log({
    organizationId: access.teamId,
    userId: access.userId,
    action: 'invitation.deleted',
    resourceType: 'invitation',
    resourceId: invitation.id,
    before: {
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
    },
  })

  return legacyOrganizationJson(
    { success: true },
    { status: 200 },
    '/api/v1/organizations/me/invitations/:id'
  )
}
