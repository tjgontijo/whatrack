'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, RefreshCw } from 'lucide-react'
import axios from 'axios'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { authClient } from '@/lib/auth/auth-client'
import { MetaROIContent } from '@/components/dashboard/meta-ads/dashboard/meta-roi-content'
import { Button } from '@/components/ui/button'

export default function MetaROIOverviewPage() {
  const { data: organization } = authClient.useActiveOrganization()
  const organizationId = organization?.id

  const {
    data: roiData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['meta-ads', 'insights', organizationId],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/meta-ads/insights?organizationId=${organizationId}`)
      return res.data
    },
    enabled: !!organizationId,
  })

  return (
    <PageShell>
      <PageHeader
        title="Dashboard ROI Meta Ads"
        description="Analise o retorno sobre o investimento de suas campanhas Click-to-WhatsApp"
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
            Atualizar Dados
          </Button>
        }
      />

      <PageContent>
        <MetaROIContent
          roiData={roiData}
          isLoading={isLoading}
          isRefetching={isRefetching}
          onRefresh={() => refetch()}
        />
      </PageContent>
    </PageShell>
  )
}
