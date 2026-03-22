'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { MetaAdsCampaignsClient } from '@/app/(dashboard)/[organizationSlug]/[projectSlug]/meta-ads/campaigns/client'
import { MetaROIContent } from '@/components/dashboard/meta-ads/dashboard/meta-roi-content'
import { HeaderPageShell, HeaderTabs } from '@/components/dashboard/layout'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { metaAdsClient } from '@/lib/meta-ads/client'
import type { MetaRoiResponse } from '@/types/meta-ads/meta-ads'

const TABS = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'campaigns', label: 'Campanhas' },
]

export function MetaAdsPageContent() {
  const [activeTab, setActiveTab] = useState('overview')
  const { organizationId } = useRequiredProjectRouteContext()

  const { data: roiData, isLoading, refetch, isRefetching } = useQuery<MetaRoiResponse>({
    queryKey: ['meta-ads', 'insights', { organizationId }],
    queryFn: () => metaAdsClient.getInsights(organizationId!),
    enabled: !!organizationId,
  })

  return (
    <HeaderPageShell
      title="Meta Ads"
      selector={<HeaderTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />}
      onRefresh={activeTab === 'overview' ? () => void refetch() : undefined}
      isRefreshing={isRefetching || isLoading}
    >
      {activeTab === 'overview' ? (
        <MetaROIContent
          roiData={roiData}
          isLoading={isLoading}
          isRefetching={isRefetching}
          onRefresh={() => refetch()}
        />
      ) : (
        <MetaAdsCampaignsClient />
      )}
    </HeaderPageShell>
  )
}
