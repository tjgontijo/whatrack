import { MetaAdsSettingsContent } from '@/components/dashboard/meta-ads/settings/meta-ads-settings-content'
import { HeaderPageShell } from '@/components/dashboard/layout'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type SettingsMetaAdsPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function SettingsMetaAdsPage({ params }: SettingsMetaAdsPageProps) {
  const { organizationSlug } = await params
  const access = await requireWorkspacePageAccess({
    permissions: 'manage:integrations',
    organizationSlug,
  })

  return (
    <HeaderPageShell title="Meta Ads">
      <MetaAdsSettingsContent organizationId={access.organizationId} />
    </HeaderPageShell>
  )
}
