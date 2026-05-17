import { notFound } from 'next/navigation'

import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { ProfileSettingsContent } from '@/features/settings/components/profile-settings-content'
import { getAccountSummary } from '@/features/account'
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
