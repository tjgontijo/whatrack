'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { authClient } from '@/lib/auth/auth-client'
import { MetaROIContent } from '@/components/dashboard/meta-ads/dashboard/meta-roi-content'

export default function MetaROIOverviewPage() {
    const { data: organization } = authClient.useActiveOrganization()
    const organizationId = organization?.id

    const { data: roiData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['meta-ads', 'insights', organizationId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/meta-ads/insights?organizationId=${organizationId}`)
            return res.data
        },
        enabled: !!organizationId
    })

    return (
        <MetaROIContent
            roiData={roiData}
            isLoading={isLoading}
            isRefetching={isRefetching}
            onRefresh={() => refetch()}
        />
    )
}
