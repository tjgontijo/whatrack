'use client'

import { authClient } from '@/lib/auth/auth-client'
import { MetaAdsSettingsContent } from '@/components/dashboard/meta-ads/settings/meta-ads-settings-content'

export default function MetaAdsSettingsPage() {
    const { data: organization } = authClient.useActiveOrganization()
    const organizationId = organization?.id

    return <MetaAdsSettingsContent organizationId={organizationId} />
}
