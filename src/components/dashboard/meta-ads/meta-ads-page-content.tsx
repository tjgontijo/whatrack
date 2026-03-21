'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart3, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { MetaAdsCampaignsClient } from '@/app/(dashboard)/[organizationSlug]/[projectSlug]/meta-ads/campaigns/client'
import { MetaROIContent } from '@/components/dashboard/meta-ads/dashboard/meta-roi-content'
import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { useRequiredProjectPath, useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { metaAdsClient } from '@/lib/meta-ads/client'
import type { MetaRoiResponse } from '@/types/meta-ads/meta-ads'

type MetaAdsPageContentProps = {
  initialTab: string
}

const DEFAULT_TAB = 'overview'

export function MetaAdsPageContent({ initialTab }: MetaAdsPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const metaAdsPath = useRequiredProjectPath('/meta-ads')
  const { organizationId } = useRequiredProjectRouteContext()

  const {
    data: roiData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<MetaRoiResponse>({
    queryKey: ['meta-ads', 'insights', { organizationId }],
    queryFn: () => metaAdsClient.getInsights(organizationId!),
    enabled: !!organizationId,
  })

  const selectedTab = useMemo(
    () => (initialTab === 'campaigns' ? 'campaigns' : DEFAULT_TAB),
    [initialTab],
  )

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="Meta Ads"
        description="Acompanhe o ROI e a operação das campanhas Click-to-WhatsApp por projeto."
        icon={BarChart3}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching || isLoading ? 'animate-spin' : ''}`} />
            Atualizar dados
          </Button>
        }
      />

      <PageContent>
        <Tabs
          value={selectedTab}
          onValueChange={(tab) => {
            const params = new URLSearchParams(searchParams.toString())

            if (tab === DEFAULT_TAB) {
              params.delete('tab')
            } else {
              params.set('tab', tab)
            }

            const query = params.toString()
            router.replace(query ? `${metaAdsPath}?${query}` : metaAdsPath)
          }}
          className="gap-6"
        >
          <TabsList variant="line" className="w-full justify-start rounded-none border-b p-0">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <MetaROIContent
              roiData={roiData}
              isLoading={isLoading}
              isRefetching={isRefetching}
              onRefresh={() => refetch()}
            />
          </TabsContent>

          <TabsContent value="campaigns">
            <MetaAdsCampaignsClient />
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageShell>
  )
}
