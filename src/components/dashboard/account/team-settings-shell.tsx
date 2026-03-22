'use client'

import { useState } from 'react'

import { HeaderPageShell, HeaderTabs, RefreshButton } from '@/components/dashboard/layout'
import { TeamAccessContent } from './team-access-content'
import type { OrganizationRole } from './team-access-content'

const TEAM_TABS = [
  { key: 'membros', label: 'Membros' },
  { key: 'papeis', label: 'Papéis' },
  { key: 'permissoes', label: 'Permissões' },
]

type TeamMember = {
  id: string
  userId: string
  role: string
  name: string
  email: string
}

type TeamInvitation = {
  id: string
  email: string
  role: string | null
  expiresAt: string
}

type TeamSettingsShellProps = {
  initialMembers?: TeamMember[]
  initialInvitations?: TeamInvitation[]
  initialRoles?: OrganizationRole[]
  initialPermissionCatalog?: string[]
  organizationId: string
}

export function TeamSettingsShell({
  initialMembers,
  initialInvitations,
  initialRoles,
  initialPermissionCatalog,
  organizationId,
}: TeamSettingsShellProps) {
  const [activeTab, setActiveTab] = useState('membros')

  return (
    <HeaderPageShell
      title="Equipe"
      selector={<HeaderTabs tabs={TEAM_TABS} activeTab={activeTab} onTabChange={setActiveTab} />}
      refreshAction={<RefreshButton queryKey={['organizations', 'me', 'members', organizationId]} />}
    >
      <TeamAccessContent
        initialMembers={initialMembers}
        initialInvitations={initialInvitations}
        initialRoles={initialRoles}
        initialPermissionCatalog={initialPermissionCatalog}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </HeaderPageShell>
  )
}
