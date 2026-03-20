import { Suspense } from 'react'
import { CreditCard } from 'lucide-react'

import { BillingPageContent } from '@/components/dashboard/billing/billing-page-content'
import { BillingPageSkeleton } from '@/components/dashboard/billing/billing-page-skeleton'
import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { listPublicBillingPlans } from '@/services/billing/billing-plan-catalog.service'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function SubscriptionPage() {
  await requireWorkspacePageAccess({ requireOwner: true })
  const availablePlans = await listPublicBillingPlans()

  return (
    <PageShell maxWidth="5xl">
      <PageHeader
        title="Assinatura"
        description="Gerencie o plano base, clientes ativos e extras operacionais do workspace."
        icon={CreditCard}
      />

      <PageContent>
        <Suspense fallback={<BillingPageSkeleton />}>
          <BillingPageContent availablePlans={availablePlans} />
        </Suspense>
      </PageContent>
    </PageShell>
  )
}
