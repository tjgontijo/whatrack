import { User } from 'lucide-react'
import { redirect } from 'next/navigation'

import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { ProfileSettingsContent } from '@/components/dashboard/settings/profile-settings-content'
import { getAccountSummary } from '@/services/account/account-summary.service'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function ProfilePage() {
  const access = await requireWorkspacePageAccess()
  const summary = await getAccountSummary({
    userId: access.userId,
    organizationId: access.organizationId,
  })

  if (!summary.account) {
    redirect('/dashboard')
  }

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title="Perfil"
        description="Gerencie suas informações pessoais e a segurança da conta."
        icon={User}
      />

      <PageContent>
        <ProfileSettingsContent account={summary.account} />
      </PageContent>
    </PageShell>
  )
}
