import { TrendingUp } from 'lucide-react'

import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { MetaAdsSettingsContent } from '@/components/dashboard/meta-ads/settings/meta-ads-settings-content'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function MetaAdsSettingsPage() {
  const access = await requireWorkspacePageAccess({ permissions: 'manage:integrations' })

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Meta Ads"
        description="Gerencie perfis, contas de anúncio, pixels e vínculos por projeto."
        icon={TrendingUp}
      />

      <PageContent className="px-0 pb-0">
        <MetaAdsSettingsContent organizationId={access.organizationId} />
      </PageContent>
    </PageShell>
  )
}
