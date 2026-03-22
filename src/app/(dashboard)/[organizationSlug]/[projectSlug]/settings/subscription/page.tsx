import { Suspense } from 'react'

import { HeaderPageShell, RefreshButton } from '@/components/dashboard/layout'
import { BillingPageContent } from '@/components/dashboard/billing/billing-page-content'
import { BillingPageSkeleton } from '@/components/dashboard/billing/billing-page-skeleton'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'
import { listPublicBillingPlans } from '@/services/billing/billing-plan-catalog.service'

type SubscriptionPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function SubscriptionPage({ params }: SubscriptionPageProps) {
  const { organizationSlug } = await params
  const access = await requireWorkspacePageAccess({ requireOwner: true, organizationSlug })
  const availablePlans = await listPublicBillingPlans()

  return (
    <HeaderPageShell
      title="Assinatura"
      refreshAction={<RefreshButton queryKey={['subscription', access.organizationId]} />}
    >
      <Suspense fallback={<BillingPageSkeleton />}>
        <BillingPageContent availablePlans={availablePlans} />
      </Suspense>
    </HeaderPageShell>
  )
}
