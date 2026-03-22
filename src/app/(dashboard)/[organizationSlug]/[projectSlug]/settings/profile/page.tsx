import { notFound } from 'next/navigation'

import { HeaderPageShell } from '@/components/dashboard/layout'
import { ProfileSettingsContent } from '@/components/dashboard/settings/profile-settings-content'
import { getAccountSummary } from '@/services/account/account-summary.service'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type ProfilePageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { organizationSlug } = await params
  const access = await requireWorkspacePageAccess({ organizationSlug })
  const summary = await getAccountSummary({
    userId: access.userId,
    organizationId: access.organizationId,
  })

  if (!summary.account) {
    notFound()
  }

  return (
    <HeaderPageShell title="Perfil">
      <ProfileSettingsContent account={summary.account} />
    </HeaderPageShell>
  )
}
