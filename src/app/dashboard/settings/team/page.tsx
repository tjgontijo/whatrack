import { Users } from 'lucide-react'

import { TeamAccessContent } from '@/components/dashboard/account/team-access-content'
import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function TeamPage() {
  await requireWorkspacePageAccess({ permissions: 'manage:members' })

  return (
    <PageShell maxWidth="5xl">
      <PageHeader
        title="Equipe"
        description="Gerencie membros, papéis e permissões do workspace."
        icon={Users}
      />
      <PageContent>
        <TeamAccessContent />
      </PageContent>
    </PageShell>
  )
}
