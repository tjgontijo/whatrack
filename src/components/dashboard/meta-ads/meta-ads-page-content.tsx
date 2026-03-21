'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { MetaAdsCampaignsClient } from '@/app/(dashboard)/[organizationSlug]/[projectSlug]/meta-ads/campaigns/client'
import { MetaROIContent } from '@/components/dashboard/meta-ads/dashboard/meta-roi-content'
import { SectionPageShell } from '@/components/dashboard/layout/section-page-shell'
import { Button } from '@/components/ui/button'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { metaAdsClient } from '@/lib/meta-ads/client'
import { cn } from '@/lib/utils/utils'
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
    <SectionPageShell
      title="Meta Ads"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        activeTab === 'overview' ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', (isRefetching || isLoading) && 'animate-spin')} />
          </Button>
        ) : null
      }
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
    </SectionPageShell>
  )
}
