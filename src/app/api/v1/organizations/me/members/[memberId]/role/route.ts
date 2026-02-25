import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auditService } from '@/services/audit/audit.service'
import { prisma } from '@/lib/db/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { legacyOrganizationJson } from '@/server/http/legacy-organization'
import { getOrganizationRoleByKey } from '@/server/organization/organization-rbac.service'
import { assertCanDelegatePermissions } from '@/server/organization/permission-delegation-policy'

const updateMemberRoleSchema = z.object({
  role: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .transform((value) => value.toLowerCase()),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId/role'
    )
  }

  if (access.role !== 'owner' && access.role !== 'admin') {
    return legacyOrganizationJson(
      { error: 'Apenas owner/admin podem alterar papel de membros.' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId/role'
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = updateMemberRoleSchema.safeParse(body)

  if (!parsed.success) {
    return legacyOrganizationJson(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
      '/api/v1/organizations/me/members/:memberId/role'
    )
  }

  const { memberId } = await params
  const selectedRole = await getOrganizationRoleByKey(access.teamId, parsed.data.role)

  if (!selectedRole) {
    return legacyOrganizationJson(
      { error: 'Papel não encontrado para esta organização.' },
      { status: 404 },
      '/api/v1/organizations/me/members/:memberId/role'
    )
  }

  const targetMember = await prisma.member.findFirst({
    where: {
      id: memberId,
      organizationId: access.teamId,
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  })

  if (!targetMember) {
    return legacyOrganizationJson(
      { error: 'Membro não encontrado' },
      { status: 404 },
      '/api/v1/organizations/me/members/:memberId/role'
    )
  }

  if (access.role !== 'owner' && (targetMember.role === 'owner' || selectedRole.key === 'owner')) {
    return legacyOrganizationJson(
      { error: 'Somente owner pode alterar papel para/de owner.' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId/role'
    )
  }

  if (access.role === 'admin' && !['user', 'admin'].includes(selectedRole.key)) {
    return legacyOrganizationJson(
      { error: 'Admin pode atribuir apenas papéis user/admin.' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId/role'
    )
  }

  try {
    assertCanDelegatePermissions(
      access.globalRole,
      selectedRole.permissions.map((permission) => permission.permissionKey)
    )
  } catch (error) {
    return legacyOrganizationJson(
      { error: error instanceof Error ? error.message : 'Permissão de delegação inválida.' },
      { status: 403 },
      '/api/v1/organizations/me/members/:memberId/role'
    )
  }

  if (targetMember.role === 'owner' && selectedRole.key !== 'owner') {
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
        '/api/v1/organizations/me/members/:memberId/role'
      )
    }
  }

  const updatedMember = await prisma.member.update({
    where: { id: targetMember.id },
    data: { role: selectedRole.key },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  })

  void auditService.log({
    organizationId: access.teamId,
    userId: access.userId,
    action: 'member.role_updated',
    resourceType: 'member',
    resourceId: targetMember.id,
    before: { role: targetMember.role, userId: targetMember.userId },
    after: { role: updatedMember.role, userId: updatedMember.userId, roleName: selectedRole.name },
  })

  return legacyOrganizationJson(
    {
      id: updatedMember.id,
      memberId: updatedMember.id,
      userId: updatedMember.userId,
      role: updatedMember.role,
      user: updatedMember.user,
    },
    { status: 200 },
    '/api/v1/organizations/me/members/:memberId/role'
  )
}
