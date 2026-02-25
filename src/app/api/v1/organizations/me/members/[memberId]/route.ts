import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auditService } from '@/lib/audit.service'
import { legacyOrganizationJson } from '@/server/http/legacy-organization'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId'
    )
  }

  if (access.role !== 'owner' && access.role !== 'admin') {
    return legacyOrganizationJson(
      { error: 'Apenas owner/admin podem remover membros.' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId'
    )
  }

  const { memberId } = await params

  const targetMember = await prisma.member.findFirst({
    where: { id: memberId, organizationId: access.teamId },
    select: { id: true, userId: true, role: true },
  })

  if (!targetMember) {
    return legacyOrganizationJson(
      { error: 'Membro não encontrado' },
      { status: 404 },
      '/api/v1/organizations/me/members/:memberId'
    )
  }

  if (access.role !== 'owner' && targetMember.role === 'owner') {
    return legacyOrganizationJson(
      { error: 'Somente owner pode remover membros owner.' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId'
    )
  }

  if (access.role === 'admin' && !['user', 'admin'].includes(targetMember.role)) {
    return legacyOrganizationJson(
      { error: 'Admin pode remover apenas membros com papel user/admin.' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId'
    )
  }

  if (targetMember.role === 'owner') {
    const ownersCount = await prisma.member.count({
      where: {
        organizationId: access.teamId,
        role: 'owner',
      },
    })

    if (ownersCount <= 1) {
      return legacyOrganizationJson(
        { error: 'Não é possível remover o último owner da equipe.' },
        { status: 400 },
        '/api/v1/organizations/me/members/:memberId'
      )
    }
  }

  await prisma.member.delete({
    where: { id: targetMember.id },
  })

  void auditService.log({
    organizationId: access.teamId,
    userId: access.userId,
    action: 'member.removed',
    resourceType: 'member',
    resourceId: memberId,
    before: { userId: targetMember.userId, role: targetMember.role },
  })

  return legacyOrganizationJson(
    { success: true },
    { status: 200 },
    '/api/v1/organizations/me/members/:memberId'
  )
}
