import { TeamSettingsShell } from '@/features/account/components/team-settings-shell'
import { listOrganizationPendingInvitations } from '@/features/organizations/services/organization-invitations.service'
import { listOrganizationMembers } from '@/features/organizations/services/organization-members.service'
import { listOrganizationRolesWithCatalog } from '@/features/organizations/services/organization-roles.service'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type TeamPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { organizationSlug } = await params
  const access = await requireWorkspacePageAccess({
    permissions: 'manage:members',
    organizationSlug,
  })

  const [membersResult, invitationsResult, rolesResult] = await Promise.all([
    listOrganizationMembers({ organizationId: access.organizationId, role: access.role }),
    listOrganizationPendingInvitations({
      organizationId: access.organizationId,
      actorRole: access.role,
    }),
    listOrganizationRolesWithCatalog({
      organizationId: access.organizationId,
      globalRole: access.globalRole,
    }),
  ])

  const initialMembers = 'data' in membersResult ? membersResult.data : []
  const rawInvitations = 'data' in invitationsResult ? (invitationsResult.data ?? []) : []
  const initialInvitations = rawInvitations.map((inv) => ({
    ...inv,
    expiresAt: inv.expiresAt.toISOString(),
  }))
  const initialRoles = rolesResult.data
  const initialPermissionCatalog = rolesResult.permissionCatalog

  return (
    <TeamSettingsShell
      organizationId={access.organizationId}
      initialMembers={initialMembers}
      initialInvitations={initialInvitations}
      initialRoles={initialRoles}
      initialPermissionCatalog={initialPermissionCatalog}
    />
  )
}
